# 开发指南

[中文](development.md) | [English](development.en.md)

本文面向需要从源码构建、测试或参与开发的人。普通部署请优先阅读 [README](../README.md)。

## 环境要求

- Go 1.26
- Node.js / npm
- 前端依赖以 `web/package-lock.json` 为准

## 从源码构建

```bash
npm --prefix web install
make build
```

构建产物：

```text
./homelab-panel
```

启动本地服务：

```bash
./homelab-panel serve --port 9090 --dir ./data
```

## Makefile 目标

| 命令 | 用途 |
| --- | --- |
| `make help` | 查看可用目标 |
| `make web` | 构建 React 前端 |
| `make build` | 构建前端并生成 Go 二进制 |
| `make all` | 完整构建 |
| `make fmt` | 格式化前后端代码 |
| `make check` | 静态检查 |
| `make test` | 运行前后端测试并生成覆盖率 |
| `make clean` | 清理构建、运行和测试产物 |
| `make serve` | 本地构建并启动服务 |

## 前端开发

```bash
cd web
npm install
npm run build
npm run type-check
npm run lint
npm run test
```

格式化和 lint 由 Biome 驱动：

```bash
npm run lint:fix
```

## 后端开发

```bash
gofmt -w main.go internal
go vet ./...
go test ./...
CGO_ENABLED=0 go build -o /tmp/homelab-panel-test -ldflags "-s -w" .
```

## 手动构建流程

前端：

```bash
cd web
npm install
npm run build
```

后端：

```bash
cd ..
CGO_ENABLED=0 go build -o homelab-panel -ldflags "-s -w" .
```

## 交叉编译

Linux amd64 示例：

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 \
  go build -o homelab-panel-linux-amd64 -ldflags "-s -w" .
```

Windows amd64 示例：

```bash
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 \
  go build -o homelab-panel-windows-amd64.exe -ldflags "-s -w" .
```

## 提交前检查

代码变更提交前建议执行：

```bash
make fmt
make check
make test
git diff --check
```
