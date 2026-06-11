APP := homelab-panel
VERSION := v$(shell date +%Y%m%d)-$(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION)"
GOENV ?= CGO_ENABLED=0

WEB_DIR := web
WEB_DIST := $(WEB_DIR)/dist
BIN := $(APP)

.PHONY: help web build swag all fmt check test clean serve backend-assets

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

backend-assets:
	go install -a -v github.com/go-bindata/go-bindata/...@latest
	go install -a -v github.com/elazarl/go-bindata-assetfs/...@latest
	go-bindata-assetfs -o=assets/bindata.go -pkg=assets assets/...

build: backend-assets
	$(GOENV) go build -o $(BIN) $(LDFLAGS) main.go

swag:
	swag init -g main.go -o docs

all: web swag build

fmt:
	gofmt -w main.go api assets global initialize lib models router structs
	cd $(WEB_DIR) && npm run lint:fix

check:
	go vet ./...
	cd $(WEB_DIR) && npm run type-check
	cd $(WEB_DIR) && npm run lint

test:
	go test ./...

clean:
	rm -rf $(BIN) docs $(WEB_DIST) release logs runtime coverage
	rm -rf assets/bindata.go bindata.go

serve: backend-assets
	go run main.go
