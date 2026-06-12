APP := homelab-panel
VERSION := v$(shell date +%Y%m%d)-$(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION)"
GOENV ?= CGO_ENABLED=0

WEB_DIR := web
WEB_DIST := $(WEB_DIR)/dist
BIN := $(APP)

.PHONY: help web build swag all fmt check test clean serve

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  web            Build Vue frontend"
	@echo "  build          Build Go backend binary"
	@echo "  swag           Generate Swagger docs"
	@echo "  all            Build frontend, docs, and backend"
	@echo "  fmt            Format frontend and backend code"
	@echo "  check          Run static checks"
	@echo "  test           Run tests"
	@echo "  clean          Remove build, runtime, and test outputs"
	@echo "  serve          Start the service locally"
	@echo ""
	@echo "Version: $(VERSION)"

web:
	cd $(WEB_DIR) && npm ci
	cd $(WEB_DIR) && npm run build

build: web
	$(GOENV) go build -o $(BIN) $(LDFLAGS) main.go

swag:
	@if command -v swag >/dev/null 2>&1; then swag init -g main.go -o docs; else echo "swag not installed; skipping"; fi

all: web swag build

fmt:
	gofmt -w main.go docs internal
	cd $(WEB_DIR) && npm run lint:fix

check: web
	go vet ./...
	cd $(WEB_DIR) && npm run type-check
	cd $(WEB_DIR) && npm run lint

test: web
	go test ./...

clean:
	rm -rf $(BIN) $(WEB_DIST) release logs coverage
	rm -rf assets/bindata.go bindata.go

serve: build
	./$(BIN) serve
