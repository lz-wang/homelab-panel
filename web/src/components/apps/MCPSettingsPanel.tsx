import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { API_SUCCESS_CODE } from '@/api/apiResult'
import {
    deleteMCPToken,
    generateMCPToken,
    getMCPSettings,
    type MCPSettings,
    type MCPTokenInfo,
    updateMCPSettings,
} from '@/api/mcp'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { useApiAction } from '@/hooks/useApiAction'
import { copyToClipboard } from '@/utils/clipboard'

function mcpEndpoint() {
    return `${window.location.origin}/api/v1/mcp`
}

function formatTime(value?: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('zh-CN', { hour12: false })
}

// maskPrefix 展示 token 的可识别前缀，并用占位符表示隐藏的 secret 部分（如 abc******）。
function maskPrefix(prefix: string) {
    return `${prefix}········`
}

// 客户端配置模板。token 不写入配置，统一由环境变量 HOMELAB_PANEL_MCP_TOKEN 提供。
function codexConfig(endpoint: string) {
    return [
        '[mcp_servers.homelab_panel]',
        `url = "${endpoint}"`,
        'bearer_token_env_var = "HOMELAB_PANEL_MCP_TOKEN"',
        'enabled = true',
        'default_tools_approval_mode = "prompt"',
        'tool_timeout_sec = 30',
    ].join('\n')
}

function claudeCodeCommand(endpoint: string) {
    return [
        'claude mcp add --transport http homelab-panel \\',
        `  ${endpoint} \\`,
        '  --header "Authorization: Bearer $HOMELAB_PANEL_MCP_TOKEN"',
    ].join('\n')
}

function mcpJsonConfig(endpoint: string) {
    const tokenPlaceholder = '$' + '{HOMELAB_PANEL_MCP_TOKEN}'

    return JSON.stringify(
        {
            mcpServers: {
                'homelab-panel': {
                    type: 'http',
                    url: endpoint,
                    headers: { Authorization: `Bearer ${tokenPlaceholder}` },
                },
            },
        },
        null,
        2,
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {title}
            </Typography>
            {children}
        </Stack>
    )
}

function TokenRow({
    token,
    loading,
    onDelete,
}: {
    token: MCPTokenInfo
    loading: boolean
    onDelete: () => void
}) {
    return (
        <Stack
            spacing={0.5}
            sx={{ py: 1, px: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
        >
            <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <VpnKeyOutlinedIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {maskPrefix(token.prefix)}
                    </Typography>
                </Stack>
                <IconButton
                    size="small"
                    aria-label="删除 token"
                    disabled={loading}
                    onClick={onDelete}
                >
                    <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary">
                创建：{formatTime(token.created_at)} · 最近使用：{formatTime(token.last_used_at)}
            </Typography>
        </Stack>
    )
}

export function MCPSettingsPanel() {
    const { loading, run } = useApiAction()
    const confirm = useConfirm()
    const notify = useNotify()

    const [settings, setSettings] = useState<MCPSettings | null>(null)
    const [tokenDialog, setTokenDialog] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        const response = await getMCPSettings()
        if (response.code === API_SUCCESS_CODE) setSettings(response.data)
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    async function copyText(text: string, hint = '已复制') {
        const ok = await copyToClipboard(text)
        if (ok) notify.success(hint)
        else notify.error('复制失败，请手动选择复制')
    }

    async function updateEnabled(value: boolean) {
        const response = await run(() => updateMCPSettings({ enabled: value }), {
            successMessage: '已保存',
            errorMessage: (res) => `保存失败:${res.msg}`,
        })
        if (response?.code === API_SUCCESS_CODE) setSettings(response.data)
    }

    async function handleGenerate() {
        const response = await run(() => generateMCPToken(), {
            successMessage: 'Token 已生成',
            errorMessage: (res) => `生成失败:${res.msg}`,
        })
        if (response?.code === API_SUCCESS_CODE) {
            setTokenDialog(response.data.token)
            void refresh()
        }
    }

    async function handleDeleteToken(prefix: string) {
        const ok = await confirm({
            title: '删除 Token',
            content: `确定删除前缀为 ${prefix} 的 Token？该 Token 将立即失效。`,
        })
        if (!ok) return
        const response = await run(() => deleteMCPToken(prefix), {
            successMessage: 'Token 已删除',
            errorMessage: (res) => `删除失败:${res.msg}`,
        })
        if (response?.code === API_SUCCESS_CODE) setSettings(response.data)
    }

    if (!settings) {
        return (
            <Stack sx={{ py: 6, alignItems: 'center' }}>
                <CircularProgress size={28} />
            </Stack>
        )
    }

    const endpoint = mcpEndpoint()

    return (
        <Stack spacing={3}>
            <Section title="MCP 服务">
                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.enabled}
                            disabled={loading}
                            onChange={(event) => updateEnabled(event.target.checked)}
                        />
                    }
                    label="启用 MCP HTTP 服务"
                />
                {!settings.enabled && (
                    <Typography variant="body2" color="text.secondary">
                        关闭后 /api/v1/mcp 将拒绝所有请求。
                    </Typography>
                )}
            </Section>

            <Section title="接入地址">
                <TextField
                    value={endpoint}
                    fullWidth
                    size="small"
                    slotProps={{
                        input: {
                            readOnly: true,
                            endAdornment: (
                                <IconButton
                                    aria-label="复制接入地址"
                                    edge="end"
                                    onClick={() => copyText(endpoint, '接入地址已复制')}
                                >
                                    <ContentCopyIcon />
                                </IconButton>
                            ),
                        },
                    }}
                />
            </Section>

            <Section title="Token">
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <Typography variant="body2" color="text.secondary">
                        {settings.tokens.length > 0
                            ? `已生成 ${settings.tokens.length} 个 Token，首个生成时自动启用 MCP 服务`
                            : '尚未生成 Token，生成后将自动启用 MCP 服务'}
                    </Typography>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        disabled={loading}
                        onClick={handleGenerate}
                    >
                        生成 Token
                    </Button>
                </Stack>
                {settings.tokens.map((tok) => (
                    <TokenRow
                        key={tok.prefix}
                        token={tok}
                        loading={loading}
                        onDelete={() => handleDeleteToken(tok.prefix)}
                    />
                ))}
            </Section>

            <ClientConfigs endpoint={endpoint} onCopy={copyText} />

            <TokenRevealDialog
                open={tokenDialog !== null}
                token={tokenDialog ?? ''}
                onCopy={(text) => copyText(text, 'Token 已复制')}
                onClose={() => setTokenDialog(null)}
            />
        </Stack>
    )
}

function TokenRevealDialog({
    open,
    token,
    onCopy,
    onClose,
}: {
    open: boolean
    token: string
    onCopy: (text: string) => void
    onClose: () => void
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Token 已生成</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="warning">
                        请立即复制并妥善保存，关闭后将无法再次查看明文。
                    </Alert>
                    <TextField
                        value={token}
                        fullWidth
                        multiline
                        size="small"
                        slotProps={{
                            input: {
                                readOnly: true,
                                sx: { fontFamily: 'monospace' },
                                endAdornment: (
                                    <IconButton
                                        aria-label="复制 token"
                                        onClick={() => onCopy(token)}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                ),
                            },
                        }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant="text" onClick={onClose}>
                    我已保存
                </Button>
            </DialogActions>
        </Dialog>
    )
}

function ClientConfigs({
    endpoint,
    onCopy,
}: {
    endpoint: string
    onCopy: (text: string, hint?: string) => void
}) {
    const envHint = 'export HOMELAB_PANEL_MCP_TOKEN="<粘贴你的 token>"'
    const tabs = [
        { label: 'Codex', value: codexConfig(endpoint) },
        { label: 'Claude Code', value: claudeCodeCommand(endpoint) },
        { label: '.mcp.json', value: mcpJsonConfig(endpoint) },
    ]
    const [active, setActive] = useState(0)
    const current = tabs[active] ?? tabs[0]

    return (
        <Section title="客户端配置">
            <Typography variant="body2" color="text.secondary">
                先在终端设置环境变量，再切换 tab 复制所用客户端的配置。
            </Typography>
            <TextField
                value={envHint}
                fullWidth
                size="small"
                slotProps={{
                    input: {
                        readOnly: true,
                        sx: { fontFamily: 'monospace', fontSize: 12 },
                        endAdornment: (
                            <IconButton
                                aria-label="复制环境变量"
                                edge="end"
                                onClick={() => onCopy(envHint, '环境变量已复制')}
                            >
                                <ContentCopyIcon />
                            </IconButton>
                        ),
                    },
                }}
            />
            <Tabs value={active} onChange={(_, value) => setActive(value)}>
                {tabs.map((tab) => (
                    <Tab key={tab.label} label={tab.label} />
                ))}
            </Tabs>
            <TextField
                value={current.value}
                fullWidth
                multiline
                minRows={3}
                size="small"
                slotProps={{
                    input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 12 } },
                }}
            />
            <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => onCopy(current.value)}
            >
                复制配置
            </Button>
        </Section>
    )
}
