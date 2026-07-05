# Go Server (Migration Target)

This folder contains the Go implementation used to migrate from the existing Node.js server incrementally.

## Run Locally

```bash
cd go-server
go run ./cmd/porter-server
```

## Build

```bash
cd go-server
go build ./...
```

## Endpoint Summary

- `GET /healthz`
- `GET /agent` with upgrade semantics for tunnel agents
- `/{tunnelId}/...` public request forwarding path

## Migration Plan

Use [docs/go-migration.md](../docs/go-migration.md) for the full phased migration and cutover guide.
