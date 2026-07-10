APP := homelab-panel
VERSION := v$(shell date +%Y%m%d)-$(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION)"
GOENV ?= CGO_ENABLED=0
GO_MAIN := .

WEB_DIR := web
WEB_DIST := $(WEB_DIR)/dist
BIN := $(APP)

COVERAGE_DIR := coverage
BACKEND_COVER := $(COVERAGE_DIR)/backend.out
# 排除 web/ 目录（含 node_modules 中的第三方 Go 代码，如 flatted/golang），只统计项目自身 Go 覆盖率
GO_TEST_PACKAGES = $(shell go list ./... | grep -v '/web/')

.PHONY: help web build all fmt check test test-backend test-frontend clean serve

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  web            Build React frontend"
	@echo "  build          Build Go backend binary"
	@echo "  all            Build frontend and backend"
	@echo "  fmt            Format frontend and backend code"
	@echo "  check          Run static checks"
	@echo "  test           Run frontend and backend tests with coverage"
	@echo "  test-backend   Run backend (Go) tests with coverage report"
	@echo "  test-frontend  Run frontend (Vitest) tests with coverage report"
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

test: test-backend test-frontend

test-backend: web
	@mkdir -p $(COVERAGE_DIR)
	@echo "========== Backend tests (Go) =========="
	go test -coverprofile=$(BACKEND_COVER) $(GO_TEST_PACKAGES)
	@echo ""
	@echo "========== Backend coverage (per function) =========="
	@go tool cover -func=$(BACKEND_COVER)
	@echo ""
	@echo "========== Backend total coverage =========="
	@go tool cover -func=$(BACKEND_COVER) | tail -1
	@echo ""

test-frontend:
	@echo "========== Frontend tests (Vitest) =========="
	cd $(WEB_DIR) && npx vitest run --coverage
	@echo ""
	@echo "Frontend coverage report: $(COVERAGE_DIR)/frontend/index.html"

clean:
	rm -rf $(BIN) $(WEB_DIST) release logs coverage data/logs

serve: build
	./$(BIN) serve
