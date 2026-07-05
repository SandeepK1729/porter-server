package main

import (
	"bytes"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
)

type frameType uint8

const (
	tunnelInit frameType = iota
	requestStart
	requestData
	requestEnd
	responseStart
	responseData
	responseEnd
)

type frame struct {
	Type      frameType
	RequestID string
	Payload   any
}

type pendingRequest struct {
	rw       http.ResponseWriter
	tunnelID string
	done     chan struct{}
	once     sync.Once
}

func (p *pendingRequest) markDone() {
	p.once.Do(func() {
		close(p.done)
	})
}

type agentConn struct {
	tunnelID string
	conn     net.Conn
	mu       sync.Mutex
}

func (a *agentConn) writeFrame(fr frame) error {
	buf, err := encodeFrame(fr)
	if err != nil {
		return err
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	_, err = a.conn.Write(buf)
	return err
}

type state struct {
	agents  map[string]*agentConn
	pending map[string]*pendingRequest
	mu      sync.RWMutex
}

func newState() *state {
	return &state{
		agents:  make(map[string]*agentConn),
		pending: make(map[string]*pendingRequest),
	}
}

func (s *state) setAgent(tunnelID string, agent *agentConn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.agents[tunnelID] = agent
}

func (s *state) getAgent(tunnelID string) *agentConn {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.agents[tunnelID]
}

func (s *state) removeAgent(tunnelID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.agents, tunnelID)
}

func (s *state) setPending(requestID string, pending *pendingRequest) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pending[requestID] = pending
}

func (s *state) getPending(requestID string) *pendingRequest {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.pending[requestID]
}

func (s *state) removePending(requestID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.pending, requestID)
}

func (s *state) agentCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.agents)
}

func (s *state) pendingCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.pending)
}

func (s *state) cleanupAgent(tunnelID string) {
	agent := s.getAgent(tunnelID)
	if agent != nil {
		_ = agent.conn.Close()
		s.removeAgent(tunnelID)
		log.Printf("agent disconnected and cleaned up: %s", tunnelID)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	for requestID, pending := range s.pending {
		if pending.tunnelID != tunnelID {
			continue
		}

		http.Error(pending.rw, "Agent disconnected", http.StatusBadGateway)
		pending.markDone()
		delete(s.pending, requestID)
	}
}

func main() {
	port, err := parsePort(os.Getenv("PORT"), 9000)
	if err != nil {
		log.Fatalf("invalid PORT: %v", err)
	}

	st := newState()
	mux := http.NewServeMux()
	mux.HandleFunc("/", st.handleHTTP)

	addr := fmt.Sprintf(":%d", port)
	log.Printf("porter go server listening on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func (s *state) handleHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/healthz" {
		s.handleHealth(w)
		return
	}

	if r.URL.Path == "/agent" {
		if strings.EqualFold(r.Header.Get("Connection"), "upgrade") || r.Header.Get("Upgrade") != "" {
			s.handleAgentUpgrade(w, r)
			return
		}
		w.WriteHeader(http.StatusUpgradeRequired)
		_, _ = w.Write([]byte("Upgrade Required"))
		return
	}

	s.handlePublicTraffic(w, r)
}

func (s *state) handleHealth(w http.ResponseWriter) {
	payload := map[string]any{
		"status":           "ok",
		"agents":           s.agentCount(),
		"pending_requests": s.pendingCount(),
	}
	w.Header().Set("content-type", "application/json")
	_ = json.NewEncoder(w).Encode(payload)
}

func (s *state) handlePublicTraffic(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Tunnel not found", http.StatusNotFound)
		return
	}

	tunnelID := parts[0]
	agent := s.getAgent(tunnelID)
	if agent == nil {
		http.Error(w, "Tunnel not found", http.StatusNotFound)
		return
	}

	requestID, err := randomHex(8)
	if err != nil {
		http.Error(w, "Unable to create request ID", http.StatusInternalServerError)
		return
	}

	path := "/"
	if len(parts) > 1 {
		path = "/" + strings.Join(parts[1:], "/")
	}
	if r.URL.RawQuery != "" {
		path += "?" + r.URL.RawQuery
	}

	pending := &pendingRequest{rw: w, tunnelID: tunnelID, done: make(chan struct{})}
	s.setPending(requestID, pending)

	log.Printf("incoming request %s: %s %s", requestID, r.Method, r.URL.String())

	startPayload := map[string]any{
		"method":  r.Method,
		"path":    path,
		"headers": sanitizeHeaders(r.Header),
	}

	if err := agent.writeFrame(frame{Type: requestStart, RequestID: requestID, Payload: startPayload}); err != nil {
		http.Error(w, "Agent unavailable", http.StatusBadGateway)
		s.removePending(requestID)
		pending.markDone()
		return
	}

	if err := streamRequestBodyToAgent(agent, requestID, r.Body); err != nil {
		http.Error(w, "Agent unavailable", http.StatusBadGateway)
		s.removePending(requestID)
		pending.markDone()
		return
	}

	if err := agent.writeFrame(frame{Type: requestEnd, RequestID: requestID}); err != nil {
		http.Error(w, "Agent unavailable", http.StatusBadGateway)
		s.removePending(requestID)
		pending.markDone()
		return
	}

	select {
	case <-pending.done:
		return
	case <-r.Context().Done():
		s.removePending(requestID)
		pending.markDone()
		return
	}
}

func (s *state) handleAgentUpgrade(w http.ResponseWriter, r *http.Request) {
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "Server does not support connection hijacking", http.StatusInternalServerError)
		return
	}

	conn, rw, err := hijacker.Hijack()
	if err != nil {
		http.Error(w, "Unable to upgrade connection", http.StatusInternalServerError)
		return
	}
	_ = rw.Flush()

	_, _ = conn.Write([]byte("HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: tunnel\r\n\r\n"))

	tunnelID, err := randomHex(4)
	if err != nil {
		_ = conn.Close()
		return
	}

	agent := &agentConn{tunnelID: tunnelID, conn: conn}
	s.setAgent(tunnelID, agent)
	log.Printf("agent connected: %s", tunnelID)

	if err := agent.writeFrame(frame{
		Type:      tunnelInit,
		RequestID: "0000000000000000",
		Payload:   map[string]any{"tunnelId": tunnelID},
	}); err != nil {
		s.cleanupAgent(tunnelID)
		return
	}

	go s.readAgentFrames(agent)
}

func (s *state) readAgentFrames(agent *agentConn) {
	defer s.cleanupAgent(agent.tunnelID)

	buffer := make([]byte, 0)
	chunk := make([]byte, 32*1024)

	for {
		n, err := agent.conn.Read(chunk)
		if n > 0 {
			buffer = append(buffer, chunk[:n]...)
			frames, remaining, decodeErr := decodeFrames(buffer)
			if decodeErr != nil {
				log.Printf("frame decode error for tunnel %s: %v", agent.tunnelID, decodeErr)
				return
			}
			buffer = remaining

			for _, fr := range frames {
				s.handleAgentFrame(fr)
			}
		}
		if err != nil {
			if !errors.Is(err, io.EOF) {
				log.Printf("agent socket read error for %s: %v", agent.tunnelID, err)
			}
			return
		}
	}
}

func (s *state) handleAgentFrame(fr frame) {
	if fr.Type < responseStart || fr.Type > responseEnd {
		return
	}

	pending := s.getPending(fr.RequestID)
	if pending == nil {
		return
	}

	switch fr.Type {
	case responseStart:
		status, headers := parseResponseStart(fr.Payload)
		for name, values := range headers {
			for _, value := range values {
				pending.rw.Header().Add(name, value)
			}
		}
		pending.rw.WriteHeader(status)
	case responseData:
		if body, ok := fr.Payload.([]byte); ok {
			_, _ = pending.rw.Write(body)
		}
	case responseEnd:
		pending.markDone()
		s.removePending(fr.RequestID)
	}
}

func parseResponseStart(payload any) (int, http.Header) {
	status := http.StatusOK
	headers := make(http.Header)

	obj, ok := payload.(map[string]any)
	if !ok {
		return status, headers
	}

	if rawStatus, exists := obj["status"]; exists {
		switch value := rawStatus.(type) {
		case float64:
			status = int(value)
		case int:
			status = value
		}
	}

	rawHeaders, exists := obj["headers"]
	if !exists {
		return status, headers
	}

	headerMap, ok := rawHeaders.(map[string]any)
	if !ok {
		return status, headers
	}

	for k, v := range headerMap {
		switch vv := v.(type) {
		case string:
			headers.Add(k, vv)
		case []any:
			for _, item := range vv {
				if str, ok := item.(string); ok {
					headers.Add(k, str)
				}
			}
		}
	}

	return status, headers
}

func streamRequestBodyToAgent(agent *agentConn, requestID string, body io.ReadCloser) error {
	defer body.Close()

	buf := make([]byte, 32*1024)
	for {
		n, err := body.Read(buf)
		if n > 0 {
			chunk := make([]byte, n)
			copy(chunk, buf[:n])
			if writeErr := agent.writeFrame(frame{Type: requestData, RequestID: requestID, Payload: chunk}); writeErr != nil {
				return writeErr
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
	}
}

func sanitizeHeaders(headers http.Header) map[string]any {
	sanitized := make(map[string]any)
	for key, values := range headers {
		lower := strings.ToLower(key)
		if strings.HasPrefix(lower, "x-porter-") || strings.HasPrefix(lower, "x-forwarded-") || strings.HasPrefix(lower, "fly-") {
			continue
		}
		if len(values) == 1 {
			sanitized[key] = values[0]
		} else if len(values) > 1 {
			sanitized[key] = values
		}
	}
	return sanitized
}

func encodeFrame(fr frame) ([]byte, error) {
	payload := []byte{}
	switch value := fr.Payload.(type) {
	case nil:
		payload = []byte{}
	case []byte:
		payload = value
	default:
		encoded, err := json.Marshal(value)
		if err != nil {
			return nil, err
		}
		payload = encoded
	}

	rid := fr.RequestID
	if rid == "" {
		rid = "0000000000000000"
	}
	ridBytes, err := hex.DecodeString(rid)
	if err != nil || len(ridBytes) != 8 {
		return nil, fmt.Errorf("requestId must decode to 8 bytes")
	}

	header := make([]byte, 13)
	binary.BigEndian.PutUint32(header[0:4], uint32(len(payload)+9))
	header[4] = byte(fr.Type)
	copy(header[5:13], ridBytes)

	return append(header, payload...), nil
}

func decodeFrames(buffer []byte) ([]frame, []byte, error) {
	frames := make([]frame, 0)
	offset := 0

	for len(buffer)-offset >= 4 {
		length := int(binary.BigEndian.Uint32(buffer[offset : offset+4]))
		if length < 9 {
			return nil, nil, fmt.Errorf("invalid frame length %d", length)
		}
		if len(buffer)-offset < length+4 {
			break
		}

		typeByte := frameType(buffer[offset+4])
		requestID := hex.EncodeToString(buffer[offset+5 : offset+13])
		payloadBuf := buffer[offset+13 : offset+4+length]

		var payload any = append([]byte(nil), payloadBuf...)
		if typeByte == tunnelInit || typeByte == requestStart || typeByte == responseStart {
			obj := make(map[string]any)
			if len(payloadBuf) > 0 {
				if err := json.Unmarshal(payloadBuf, &obj); err != nil {
					return nil, nil, err
				}
			}
			payload = obj
		}

		frames = append(frames, frame{Type: typeByte, RequestID: requestID, Payload: payload})
		offset += length + 4
	}

	remaining := append([]byte(nil), buffer[offset:]...)
	return frames, remaining, nil
}

func randomHex(bytesLen int) (string, error) {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func parsePort(value string, fallback int) (int, error) {
	if value == "" {
		return fallback, nil
	}
	port, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	if port <= 0 || port > 65535 {
		return 0, fmt.Errorf("port %d out of range", port)
	}
	return port, nil
}

func _debugHex(buf []byte) string {
	return strings.ToUpper(hex.EncodeToString(bytes.TrimSpace(buf)))
}
