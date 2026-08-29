# Go Migration Guide (Step by Step)

This document describes a practical migration from the current Node.js
implementation to the new Go implementation while reducing production risk.

## Scope of the Go Port

The Go server at
[go-server/cmd/porter-server/main.go](go-server/cmd/porter-server/main.go)
implements the same core flow as Node:

- HTTP health endpoint at `/healthz`
- Agent connection endpoint at `/agent` using HTTP upgrade and custom tunnel protocol
- Frame protocol compatibility (`TUNNEL_INIT`, `REQUEST_*`, `RESPONSE_*`)
- Tunnel request forwarding and response streaming
- In-memory tracking for agents and pending requests
- Cleanup of pending requests when agents disconnect

## Recommended Migration Phases

### Phase 0: Baseline and Parity Definition

1. Keep Node as source of truth in production.
2. Define parity checks:
   - Health endpoint payload shape
   - Upgrade handshake success
   - Request/response forwarding behavior
   - Agent disconnect behavior
   - Latency and throughput against the same load-test profile
3. Freeze protocol changes during migration to avoid moving targets.

### Phase 1: Dual Local Development

1. Run Node server (existing path) and Go server separately.
2. Use the same agent to validate protocol compatibility.
3. Compare behavior using existing load tests and manual request flows.

Commands:

```bash
# Node baseline
npm run build
npm run start

# Go migration server (new terminal)
cd go-server
go run ./cmd/porter-server
```

### Phase 2: CI Validation

1. CI now builds Go on every push via [ci.yml](.github/workflows/ci.yml).
2. Keep load tests against Node baseline until parity confidence is high.
3. Add Go-targeted load-test lane once test environment supports side-by-side deployment.

### Phase 3: Shadow Traffic (Recommended)

1. Deploy Go to a non-customer-facing environment.
2. Mirror selected traffic to Go (read-only/shadow mode).
3. Compare these dimensions against Node:
   - Response status distribution
   - Response size distribution
   - Error rates
   - Latency percentiles
4. Fix parity gaps before primary cutover.

### Phase 4: Controlled Cutover

1. Start with a small percentage of traffic to Go (for example 5%).
2. Monitor SLOs and error budgets.
3. Increase gradually (5% -> 25% -> 50% -> 100%).
4. Keep fast rollback path to Node.

### Phase 5: Decommission Node Runtime

1. After sustained stability, retire Node serving path.
2. Keep protocol compatibility tests for future regressions.
3. Remove dead Node-specific deployment artifacts incrementally.

## Local Developer Workflow (Go)

```bash
cd go-server

# build
 go build ./...

# run
 go run ./cmd/porter-server
```

Environment:

- `PORT` (optional, default `9000`)

## Verification Checklist

Run these checks before promoting Go:

1. `/healthz` returns expected JSON keys and values.
2. Agent successfully upgrades and receives `TUNNEL_INIT`.
3. Forwarded requests preserve method/path/body semantics.
4. Response start/data/end frames map correctly to HTTP responses.
5. Agent disconnect produces `502` for affected in-flight requests.
6. Go build is green in CI for each push.

## Current Known Gaps and Follow-ups

1. Node and Go currently rely on in-memory state; horizontal scaling still
   needs shared routing/state strategy.
2. Add integration tests that execute the frame protocol end-to-end with a
   test agent.
3. Add Go-targeted load-test run in CI once deployment harness supports both runtimes.
