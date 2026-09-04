# homelab-panel

[中文](README.md) | [English](README.en.md)

[![codecov](https://codecov.io/gh/lz-wang/homelab-panel/graph/badge.svg?token=2jDdgRukgN)](https://codecov.io/gh/lz-wang/homelab-panel)

`homelab-panel` 是一个给个人 Homelab 使用的轻量导航面板。它把前端嵌进 Go 二进制里，一个文件、一个进程就能运行。

## 项目特点

- **部署简单**：下载对应平台的二进制，指定端口和数据目录即可启动。
- **本地优先**：配置、分组、应用、文件元数据都保存在数据目录下的 `homelab-panel.json`。
- **面板可定制**：支持分组、应用卡片、搜索、时钟、背景、遮罩、圆角、标题和 favicon。
- **文件可上传**：上传内容保存在 `uploads/`，可作为图标、背景或普通静态文件访问。
- **单管理员模式**：首次启动自动生成管理员密码；忘记密码时可用 CLI 重置。
- **Agent 可管理**：内置 MCP HTTP 端点，Codex、Claude Code 等 LLM Agent 可用 token 管理面板。
- **服务化友好**：适合通过 systemd 常驻运行，日志写入数据目录，也可配合 `journalctl` 查看。

## 下载

从 [Releases](https://github.com/lz-wang/homelab-panel/releases) 下载与你的系统匹配的文件：

| 系统 | 架构 | 示例文件 |
| --- | --- | --- |
| Linux | amd64 / arm64 | `homelab-panel-v0.1-linux-amd64` |
| macOS | amd64 / arm64 | `homelab-panel-v0.1-darwin-arm64` |
| Windows | amd64 / arm64 | `homelab-panel-v0.1-windows-amd64.exe` |

可同时下载对应 `.sha256` 文件校验完整性。

macOS 或 Linux 也可以使用 Homebrew 安装和升级：

```bash
brew install lz-wang/tap/homelab-panel
brew upgrade homelab-panel
```

## 快速启动

Linux/macOS：

```bash
chmod +x homelab-panel-v0.1-linux-amd64
./homelab-panel-v0.1-linux-amd64 serve --port 9090 --dir ./data
```

Windows PowerShell：

```powershell
.\homelab-panel-v0.1-windows-amd64.exe serve --port 9090 --dir .\data
```

首次启动时，如果数据目录中没有 `homelab-panel.json`，程序会初始化数据并在 stdout 打印一次管理员密码。请立即保存该密码，然后访问：

```text
http://<服务器 IP>:9090
```

登录后可以在设置页调整面板、修改密码、管理文件和 MCP token。

### 启动参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `--port`, `-p` | `9090` | HTTP 监听端口。 |
| `--dir`, `-d` | `./data` | 数据目录，保存主数据文件、上传文件和日志。 |

数据目录示例：

```text
data/
  homelab-panel.json
  uploads/
  logs/
```

## 部署为 systemd 服务

假设程序和数据目录放在 `/root/app/`：

```bash
mkdir -p /root/app
cp homelab-panel-v0.1-linux-amd64 /root/app/homelab-panel
chmod +x /root/app/homelab-panel
```

创建 `/etc/systemd/system/homelab-panel.service`：

```ini
[Unit]
Description=Homelab Panel
After=network.target

[Service]
ExecStart=/root/app/homelab-panel serve --port 9090 --dir /root/app/data
Restart=always
RestartSec=5
WorkingDirectory=/root/app

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
systemctl daemon-reload
systemctl enable --now homelab-panel
```

常用命令：

```bash
systemctl status homelab-panel
systemctl restart homelab-panel
journalctl -u homelab-panel -f
```

如需对公网开放，建议让程序监听 `9090`，再用 Nginx/Caddy 做 HTTPS 反向代理。

## 重置管理员密码

忘记密码时，在服务器上执行：

```bash
./homelab-panel reset-password --dir ./data
```

非交互环境可以直接传入新密码：

```bash
./homelab-panel reset-password --dir ./data --password 'new-password'
```

> [!IMPORTANT]
> `--dir` 必须指向正在使用的数据目录，否则会改到错误的数据文件。

## 备份与恢复

`homelab-panel` 的状态主要由数据目录决定。建议至少备份：

- `homelab-panel.json`
- `uploads/`

### 备份

```bash
systemctl stop homelab-panel
tar -czf homelab-panel-backup-$(date +%F).tar.gz -C /root/app data
systemctl start homelab-panel
```

### 恢复

```bash
systemctl stop homelab-panel
mkdir -p /root/app
tar -xzf homelab-panel-backup-2026-07-10.tar.gz -C /root/app
systemctl start homelab-panel
```

### 迁移到新机器

复制二进制和完整数据目录即可：

```bash
scp homelab-panel root@new-host:/root/app/
scp -r data root@new-host:/root/app/
```

然后用相同数据目录启动：

```bash
/root/app/homelab-panel serve --port 9090 --dir /root/app/data
```

## 使用 LLM Agent 管理

服务提供 MCP Streamable HTTP 端点：

```text
POST /api/v1/mcp
```

在 Web UI 中启用：

1. 登录管理员账号。
2. 打开设置页中的 MCP 设置。
3. 启用 MCP，选择权限后生成 token（UI 默认只读）。
4. 立即复制明文 token。它只展示一次。
5. 在 Agent 客户端中配置 URL 和 `Authorization` header。

### Claude Code

```bash
export HOMELAB_PANEL_MCP_TOKEN="hlpmcp_xxxx..."

claude mcp add --transport http homelab-panel \
  http://<服务器 IP>:9090/api/v1/mcp \
  --header "Authorization: Bearer $HOMELAB_PANEL_MCP_TOKEN"
```

### Codex

在 `~/.codex/config.toml` 中添加 HTTP MCP 配置。设置页会提供可复制片段，核心信息是：

```toml
[mcp_servers.homelab-panel]
url = "http://<服务器 IP>:9090/api/v1/mcp"
bearer_token_env_var = "HOMELAB_PANEL_MCP_TOKEN"
```

MCP token 独立于管理员登录 JWT。`read` token 仅发现 6 个读取工具，`write` token 可发现全部 15 个工具；旧 token 自动兼容为 `write`。删除 token 前缀后，对应 token 会立即失效。

| 类型 | 工具 |
| --- | --- |
| 读取 | `get_panel`、`list_groups`、`list_apps_by_group`、`search_apps`、`get_app`、`list_files` |
| 写入 | `create_group`、`patch_group`、`delete_group`、`create_app`、`patch_app`、`delete_app`、`reorder_groups`、`reorder_apps`、`patch_settings` |

删除应用和分组是 destructive 操作；删除分组**不会**级联删除应用，须先移动或删除该分组的应用。排序工具要求提供目标集合内全部 ID，且每个 ID 恰好一次。

## 安全提示

> [!WARNING]
> 不要把数据目录作为静态目录暴露给外部访问。

- 备份文件包含管理员密码哈希、MCP token hash、面板配置和上传文件，请妥善保存。
- MCP token 明文只展示一次；泄露后请删除对应前缀并重新生成。
- 对公网开放时建议使用 HTTPS 反向代理，并限制管理入口访问来源。

## 开发

本地构建、测试、交叉编译和开发命令见 [开发指南](docs/development.md)。

## 致谢

本项目基于 [hslr-s/sun-panel](https://github.com/hslr-s/sun-panel) 项目重写而来，感谢原作者。
