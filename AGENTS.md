# Agent Guidelines for live.cursor

## Project Overview

A WebSocket server that enables real-time mouse cursor sharing and interaction. Clients connect via WebSockets, receive unique UUIDs, and broadcast mouse movement data to all connected clients.

**Stack:** Go 1.26.1, gorilla/websocket, Google UUID, embedded filesystem for static assets

---

## Build & Run Commands

### Development
```bash
# Run the server
ADDR=:8080 ORIGIN=http://localhost:8080 go run .

# Run with specific port
ADDR=:3000 ORIGIN=http://localhost:3000 go run .
```

### Build
```bash
# Build binary
go build -o live.cursor .

# Run tests
go test -v ./...

# Run single test file
go test -v -run TestFunctionName ./...

# Run tests matching pattern
go test -v -run "^Test.*$" ./...

# Run with coverage
go test -cover ./...

# Run benchmarks
go test -bench=. ./...
```

### Docker
```bash
# Build image
docker build -t live.cursor .

# Run container
docker run -dp 8080:8080 -e ORIGIN=http://localhost:8080 -e ADDR=:8080 live.cursor
```

### Code Quality
```bash
# Format code
go fmt ./...

# Tidy dependencies
go mod tidy

# Vet code
go vet ./...

# Run linter (install golangci-lint first)
golangci-lint run ./...
```

---

## Code Style Guidelines

### General Principles
- Follow standard Go idioms and conventions
- Keep code simple and readable
- Use early returns to reduce nesting
- Prefer explicit error handling over panics

### Formatting
- Use `gofumpt` for formatting
- Group imports: stdlib first, then third-party, then internal
- No blank lines between import groups
- Maximum line length: 120 characters (soft guideline)

### Imports
```go
import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "net/http"
    "sync"
    "time"

    "github.com/google/uuid"
    ws "github.com/gorilla/websocket"
)
```

### Naming Conventions
- **Types:** PascalCase (e.g., `Server`, `Client`, `Event`)
- **Variables/Fields:** camelCase (e.g., `connID`, `upgrader`)
- **Constants:** PascalCase for exported, camelCase for unexported
- **Package names:** short, lowercase, no underscores (e.g., `ws`)
- **Acronyms:** maintain original casing (e.g., `ID`, `URL`, `JSON`)
- **Error variables:** prefix with `Err` (e.g., `ErrInvalidInput`)
- **Interface names:** add `-er` suffix when appropriate (e.g., `Handler`)

### Types & Structs
```go
// Use struct tags for JSON fields (snake_case)
type Message struct {
    ConnID  string `json:"conn_id"`
    Payload struct {
        Label     string `json:"label"`
        Timestamp string `json:"timestamp"`
    } `json:"payload"`
}

// Export only necessary fields
// Prefer composition over deep embedding
```

### Error Handling
- Use `errors.Is()` and `errors.As()` for error comparisons
- Wrap errors with context using `fmt.Errorf("operation: %w", err)`
- Use sentinel errors for known error conditions
- Log errors with appropriate context before returning
- Patterns observed in codebase:
  ```go
  // Simple fatal errors
  fatalIfErr(err)
  
  // With context
  if err != nil {
      return fmt.Errorf("operation failed: %w", err)
  }
  
  // WebSocket close detection
  if ws.IsCloseError(err, ws.CloseNormalClosure, ws.CloseGoingAway) {
      // handle clean disconnect
  }
  ```

### Logging
- Use `log` package for basic logging
- Structured JSON logging to stdout for production:
  ```go
  type logEntry struct {
      Timestamp string `json:"timestamp,omitempty"`
      Event     string `json:"event,omitempty"`
      Error     string `json:"error,omitempty"`
  }
  ```
- Use mutex for concurrent log writes (see `logMu` pattern)
- Include timestamps in RFC3339 format

### Concurrency
- Use `sync.Mutex` for protecting shared state
- Use `sync.WaitGroup` for tracking goroutine completion
- Always defer `wg.Done()` after `wg.Add(1)`
- Channel communication for message passing between goroutines
- Use `context.Context` for cancellation signals

### HTTP & WebSocket
- Configure timeouts on HTTP servers (ReadTimeout, WriteTimeout, IdleTimeout)
- Validate origins in WebSocket upgrades for security
- Handle graceful shutdown with signal notification
- Use embedded filesystem (`//go:embed`) for static assets

---

## Project Structure

```
.
├── server.go           # Main application entry point
├── go.mod/go.sum       # Go module dependencies
├── web/
│   ├── template/       # HTML templates (embed directive)
│   └── static/         # CSS, JS assets (embed directive)
├── Dockerfile          # Container build
└── .github/workflows/  # CI/CD pipelines
```

---

## Testing Guidelines

- Place tests in `*_test.go` files in the same package
- Use table-driven tests for multiple test cases:
  ```go
  func TestFunction(t *testing.T) {
      tests := []struct {
          name    string
          input   string
          expected string
      }{
          {"case1", "input", "expected"},
      }
      for _, tt := range tests {
          t.Run(tt.name, func(t *testing.T) {
              got := Function(tt.input)
              if got != tt.expected {
                  t.Errorf("got %v, want %v", got, tt.expected)
              }
          })
      }
  }
  ```
- Test both success and error paths
- Mock external dependencies (WebSocket connections, etc.)

---

## Security Considerations

- Always validate WebSocket origin headers
- Use environment variables for configuration (ADDR, ORIGIN)
- Set appropriate HTTP server timeouts
- Handle and log errors without exposing internal details to clients
- Sanitize any user input before broadcasting

---

## Common Patterns

### Graceful Shutdown
```go
ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
defer stop()
<-ctx.Done()

shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

server.Shutdown(shutCtx)
```

### Client Connection Handling
1. Upgrade HTTP connection to WebSocket
2. Generate unique UUID for client
3. Register client in connection map (with mutex)
4. Read messages in loop, broadcast to others
5. Handle disconnection, clean up client registration
