APP := homelab-panel
VERSION := v$(shell date +%Y%m%d)-$(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION)"
GOENV ?= CGO_ENABLED=0
GO_MAIN := .

WEB_DIR := web
WEB_DIST := $(WEB_DIR)/dist
BIN := $(APP)

.PHONY: help web build all fmt check test clean serve

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  web            Build React frontend"
	@echo "  build          Build Go backend binary"
	@echo "  all            Build frontend and backend"
	@echo "  fmt            Format frontend and backend code"
	@echo "  check          Run static checks"
	@echo "  test           Run tests"
	@echo "  clean          Remove build, runtime, and test outputs"
	@echo "  serve          Start the service locally"
	@echo ""
	@echo "Version: $(VERSION)"

web:
	cd $(WEB_DIR) && npm run build

build: web
	$(GOENV) go build -o $(BIN) $(LDFLAGS) $(GO_MAIN)

all: web build

fmt:
	gofmt -w main.go internal
	cd $(WEB_DIR) && npm run lint:fix

check: web
	go vet ./...
	cd $(WEB_DIR) && npm run type-check
	cd $(WEB_DIR) && npm run lint

test: web
	go test ./...

clean:
	rm -rf $(BIN) $(WEB_DIST) release logs coverage data/logs

serve: build
	./$(BIN) serve
