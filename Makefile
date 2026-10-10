APP := homelab-panel
GOENV ?= CGO_ENABLED=0
GO_MAIN := .

WEB_DIR := web
WEB_DIST := $(WEB_DIR)/dist
BIN := $(APP)

COVERAGE_DIR := coverage
BACKEND_COVER := $(COVERAGE_DIR)/backend.out
# 排除 web/ 目录（含 node_modules 中的第三方 Go 代码，如 flatted/golang），只统计项目自身 Go 覆盖率
GO_TEST_PACKAGES = $(shell go list ./... | grep -v '/web/')

PLATFORMS := \
	linux/amd64 \
	linux/arm64 \
	darwin/amd64 \
	darwin/arm64 \
	windows/amd64 \
	windows/arm64

# -----------------------------------------------------------------------------
# 版本解析：唯一事实来源是 Git。
#   HEAD 正好位于 vX.Y.Z tag -> X.Y.Z（不带 v）
#   普通开发 commit          -> dev-<commit日期YYYYMMDD>-<commit7>
# 日期取 commit date（非当前机器时间），保证构建结果可重复。
# glob 要求三段数字，历史 v0.1~v0.4 两段 tag 永远不会命中。
# -----------------------------------------------------------------------------
COMMIT_ID := $(shell git rev-parse --short=7 HEAD 2>/dev/null || echo unknown)
COMMIT_DATE := $(shell git show -s --format=%cd --date=format:%Y%m%d HEAD 2>/dev/null || echo unknown)
EXACT_TAG := $(shell git describe --tags --exact-match --match 'v[0-9]*.[0-9]*.[0-9]*' HEAD 2>/dev/null || true)
TAG_VERSION := $(patsubst v%,%,$(EXACT_TAG))

VERSION ?=
ifeq ($(strip $(VERSION)),)
ifneq ($(strip $(EXACT_TAG)),)
PANEL_VERSION := $(TAG_VERSION)
else ifeq ($(COMMIT_ID),unknown)
PANEL_VERSION := dev-unknown-unknown
else
PANEL_VERSION := dev-$(COMMIT_DATE)-$(COMMIT_ID)
endif
else
PANEL_VERSION := $(VERSION)
endif

DIST_DIR := dist
LDFLAGS := -ldflags "-s -w -X main.version=$(PANEL_VERSION)"

.PHONY: help web build all fmt check test test-backend test-frontend clean serve version dist

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  web            Build React frontend"
	@echo "  build          Build Go backend binary"
	@echo "  all            Build frontend and backend"
	@echo "  version        Print the resolved version"
	@echo "  dist           Cross-build six platforms and package archives"
	@echo "  fmt            Format frontend and backend code"
	@echo "  check          Run static checks"
	@echo "  test           Run frontend and backend tests with coverage"
	@echo "  test-backend   Run backend (Go) tests with coverage report"
	@echo "  test-frontend  Run frontend (Vitest) tests with coverage report"
	@echo "  clean          Remove build, runtime, and test outputs"
	@echo "  serve          Start the service locally"
	@echo ""
	@echo "Version: $(PANEL_VERSION)"

web:
	cd $(WEB_DIR) && npm run build

build: web
	$(GOENV) go build -o $(BIN) $(LDFLAGS) $(GO_MAIN)

all: web build

version:
	@echo "$(PANEL_VERSION)"

## Cross-build six platforms into dist/: archives named
## homelab-panel_<version>_<os>_<arch>.(tar.gz|zip), per-file .sha256
## (filename only, so `sha256sum -c` works in place) and checksums.txt.
## Usage: make dist [VERSION=x.y.z]
dist: web
	@command -v tar >/dev/null 2>&1 || { echo "Error: tar is required"; exit 2; }
	@command -v zip >/dev/null 2>&1 || { echo "Error: zip is required"; exit 2; }
	@rm -rf "$(DIST_DIR)" && mkdir -p "$(DIST_DIR)"
	@set -eu; \
	sha_tool=""; \
	if command -v sha256sum >/dev/null 2>&1; then sha_tool="sha256sum"; \
	elif command -v shasum >/dev/null 2>&1; then sha_tool="shasum -a 256"; fi; \
	[ -n "$$sha_tool" ] || { echo "Error: sha256sum or shasum is required"; exit 2; }; \
	for platform in $(PLATFORMS); do \
		os=$${platform%/*}; arch=$${platform#*/}; ext=""; \
		if [ "$$os" = "windows" ]; then ext=".exe"; fi; \
		raw="$(DIST_DIR)/$(APP)_$${os}_$${arch}$$ext"; \
		echo "[homelab-panel] build $$os/$$arch"; \
		$(GOENV) GOOS="$$os" GOARCH="$$arch" \
			go build -trimpath -buildvcs=false $(LDFLAGS) -o "$$raw" $(GO_MAIN); \
		name="$(APP)_$(PANEL_VERSION)_$${os}_$${arch}"; \
		stage="$(DIST_DIR)/.stage/$$name"; \
		mkdir -p "$$stage"; \
		cp "$$raw" "$$stage/$(APP)$$ext"; \
		if [ "$$os" = "windows" ]; then \
			archive="$$name.zip"; \
			(cd "$$stage" && zip -qr "$(CURDIR)/$(DIST_DIR)/$$archive" .); \
		else \
			archive="$$name.tar.gz"; \
			tar -C "$$stage" -czf "$(CURDIR)/$(DIST_DIR)/$$archive" .; \
		fi; \
		rm -rf "$$stage" "$$raw"; \
		(cd "$(DIST_DIR)" && $$sha_tool "$$archive" > "$$archive.sha256"); \
		echo "[homelab-panel] package $$os/$$arch -> $(DIST_DIR)/$$archive"; \
	done; \
	rm -rf "$(DIST_DIR)/.stage"; \
	cd "$(DIST_DIR)" && for file in *.tar.gz *.zip; do \
		[ -f "$$file" ] || continue; \
		$$sha_tool "$$file"; \
	done > checksums.txt
	@echo "[homelab-panel] distributions -> $(DIST_DIR)/"

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
	rm -rf $(BIN) $(WEB_DIST) release dist logs coverage data/logs

serve: build
	./$(BIN) serve
