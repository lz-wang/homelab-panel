# homelab-panel

[![codecov](https://codecov.io/gh/lz-wang/homelab-panel/graph/badge.svg?token=2jDdgRukgN)](https://codecov.io/gh/lz-wang/homelab-panel)

`homelab-panel` 是一个面向个人 Homelab 的轻量导航面板。它以 Go 单二进制方式运行，内置 React + MUI + Vite 前端，不需要单独部署静态站点或 Node 服务。

## 当前特性

- 单文件部署：前端资源被嵌入 Go 二进制，启动一个进程即可提供完整 Web UI。
- 本地数据存储：面板配置、分组、应用、文件元数据等保存在数据目录下的 `homelab-panel.json`。
- 可配置导航面板：支持应用分组、应用卡片、搜索框、时钟、背景、模糊/遮罩、圆角、站点标题、favicon 等面板配置。
- 文件管理：支持上传文件，上传内容保存在数据目录下的 `uploads/`，并通过 `/uploads/...` 访问。
- 管理员登录：首次启动会自动生成管理员密码并只在 stdout 打印一次；后续可在页面内修改密码。
- CLI 密码重置：忘记密码时可以通过命令行直接重置管理员密码。
- AI Agent 管理入口：内置 MCP Streamable HTTP 端点，Codex、Claude Code 等 Agent 可以通过 bearer token 读取和修改面板。
- systemd 友好：适合以 Linux 服务方式常驻运行，日志可通过 `journalctl` 查看。

## 快速启动

从源码构建后启动：

```bash
make build
./homelab-panel serve --port 3002 --dir ./data
```

首次启动时，如果指定的数据目录中还没有 `homelab-panel.json`，程序会初始化数据文件并打印一次管理员密码。请立即保存该密码，然后访问：

```text
http://<服务器 IP>:3002
```

登录后可在设置页面调整面板、修改密码、管理 MCP token。

## 启动参数

`serve` 子命令用于启动 HTTP 服务：

```bash
./homelab-panel serve --port 3002 --dir ./data
```

参数说明：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `--port`, `-p` | `3002` | HTTP 监听端口。程序会监听 `:<port>`。 |
| `--dir`, `-d` | `./data` | 数据目录，保存主数据文件、上传文件和运行日志。 |

数据目录结构示例：

```text
data/
  homelab-panel.json   # 主数据文件
  uploads/             # 上传文件
  logs/                # 应用日志
```

如果要监听 80 端口并把数据放到 `/root/app/data`：

```bash
./homelab-panel serve --port 80 --dir /root/app/data
```

## 重置管理员密码

如果忘记管理员密码，可以在服务器上执行：

```bash
./homelab-panel reset-password --dir ./data
```

命令会交互式输入并确认新密码。非交互环境可以直接传入密码：

```bash
./homelab-panel reset-password --dir ./data --password 'new-password'
```

注意：`--dir` 必须指向正在使用的数据目录。该命令会修改 `<dir>/homelab-panel.json` 中的管理员密码哈希。

## 数据备份与恢复

`homelab-panel` 的状态主要由数据目录决定。备份时建议停止服务或在低写入窗口操作，至少保存：

- `<data-dir>/homelab-panel.json`
- `<data-dir>/uploads/`

示例：备份 `/root/app/data`：

```bash
systemctl stop homelab-panel
tar -czf homelab-panel-backup-$(date +%F).tar.gz -C /root/app data
systemctl start homelab-panel
```

恢复到 `/root/app/data`：

```bash
systemctl stop homelab-panel
mkdir -p /root/app
tar -xzf homelab-panel-backup-2026-06-21.tar.gz -C /root/app
systemctl start homelab-panel
```

如果只是迁移到另一台机器，复制二进制文件和完整数据目录即可：

```bash
scp homelab-panel root@new-host:/root/app/
scp -r data root@new-host:/root/app/
```

然后在新机器上用相同数据目录启动：

```bash
/root/app/homelab-panel serve --port 80 --dir /root/app/data
```

## 使用 AI Agent 连接管理

服务提供 MCP Streamable HTTP 端点：

```text
POST /api/v1/mcp
```

使用步骤：

1. 登录 Web UI。
2. 打开设置页中的 MCP 设置。
3. 启用 MCP 并生成 token。
4. 立即复制明文 token。明文只展示一次，服务端只保存 sha256 hash 和展示前缀。
5. 在 Agent 客户端中配置 HTTP MCP 地址和 Authorization 头。

Claude Code 示例：

```bash
export HOMELAB_PANEL_MCP_TOKEN="hlpmcp_xxxx..."

claude mcp add --transport http homelab-panel \
  http://<服务器 IP>:3002/api/v1/mcp \
  --header "Authorization: Bearer $HOMELAB_PANEL_MCP_TOKEN"
```

Codex 可在 `~/.codex/config.toml` 中配置 HTTP MCP 服务；设置页会提供可复制的配置片段。核心信息是：

- URL：`http://<服务器 IP>:3002/api/v1/mcp`
- Header：`Authorization: Bearer <MCP token>`

MCP 鉴权独立于管理员登录 JWT。只要 token 有效，Agent 即可使用已开放的 MCP 工具管理面板数据。删除 token 前缀后，对应 token 会立即失效。

## 使用 systemd 管理

假设二进制和数据目录放在 `/root/app/`：

```bash
mkdir -p /root/app
cp homelab-panel /root/app/homelab-panel-linux-amd64
chmod +x /root/app/homelab-panel-linux-amd64
```

创建服务文件：

```bash
vim /etc/systemd/system/homelab-panel.service
```

内容示例：

```ini
[Unit]
Description=Homelab Panel
After=network.target

[Service]
ExecStart=/root/app/homelab-panel-linux-amd64 serve --port 80 --dir /root/app/data
Restart=always
RestartSec=5
User=root
Group=root
WorkingDirectory=/root/app/

[Install]
WantedBy=multi-user.target
```

加载并启用：

```bash
systemctl daemon-reload
systemctl enable homelab-panel
systemctl start homelab-panel
```

常用管理命令：

```bash
systemctl status homelab-panel
systemctl stop homelab-panel
systemctl restart homelab-panel

systemctl enable homelab-panel
systemctl disable homelab-panel

journalctl -u homelab-panel -f
```

如果使用 80/443 等低端口，通常需要 root 或额外的端口绑定能力。也可以让程序监听 3002，再通过 Nginx/Caddy 反向代理到外部域名。

## 自行构建

依赖：

- Go 1.26
- Node.js / npm
- 前端依赖以 `web/package-lock.json` 为准

完整构建：

```bash
npm --prefix web install
make build
```

构建完成后会生成：

```text
./homelab-panel
```

常用开发命令：

```bash
make help      # 查看 Makefile 目标
make web       # 只构建前端
make build     # 构建前端并生成 Go 二进制
make all       # 等同于完整构建
make fmt       # 格式化前后端代码
make check     # 静态检查
make test      # 运行测试
make clean     # 清理构建和运行产物
make serve     # 本地构建并启动
```

手动构建也可以分两步执行：

```bash
cd web
npm install
npm run build

cd ..
CGO_ENABLED=0 go build -o homelab-panel -ldflags "-s -w" .
```

交叉编译 Linux amd64 示例：

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 \
  go build -o homelab-panel-linux-amd64 -ldflags "-s -w" .
```

## 安全建议

- 不要把数据目录暴露为静态目录。
- 备份文件中包含管理员密码哈希、MCP token hash、面板配置和上传文件，请妥善保存。
- MCP token 明文只展示一次；泄露后请在设置页删除对应前缀并重新生成。
- 对公网开放时建议放在 HTTPS 反向代理后面，并限制管理入口访问来源。
