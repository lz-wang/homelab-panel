import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
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
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
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
import { localeTag, useTranslation } from '@/locales'
import { useLocaleStore } from '@/store/locale'
import { copyToClipboard } from '@/utils/clipboard'

function mcpEndpoint() {
    return `${window.location.origin}/api/v1/mcp`
}

function formatTime(value?: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    const tag = localeTag(useLocaleStore.getState().lang)
    return date.toLocaleString(tag, { hour12: false })
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
    const { t } = useTranslation()
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
                    <Chip
                        size="small"
                        label={token.scope === 'read' ? t('mcp.scopeRead') : t('mcp.scopeWrite')}
                        color={token.scope === 'read' ? 'info' : 'warning'}
                        variant="outlined"
                    />
                </Stack>
                <IconButton
                    size="small"
                    aria-label={t('mcp.deleteTokenAria')}
                    disabled={loading}
                    onClick={onDelete}
                >
                    <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary">
                {t('mcp.tokenMeta', {
                    created: formatTime(token.created_at),
                    lastUsed: formatTime(token.last_used_at),
                })}
            </Typography>
        </Stack>
    )
}

export function MCPSettingsPanel() {
    const { loading, run } = useApiAction()
    const confirm = useConfirm()
    const notify = useNotify()
    const { t } = useTranslation()

    const [settings, setSettings] = useState<MCPSettings | null>(null)
    const [tokenDialog, setTokenDialog] = useState<string | null>(null)
    const [tokenScope, setTokenScope] = useState<'read' | 'write'>('read')

    const refresh = useCallback(async () => {
        const response = await getMCPSettings()
        if (response.code === API_SUCCESS_CODE) setSettings(response.data)
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    async function copyText(text: string, hint = t('mcp.copied')) {
        const ok = await copyToClipboard(text)
        if (ok) notify.success(hint)
        else notify.error(t('mcp.copyFail'))
    }

    async function updateEnabled(value: boolean) {
        const response = await run(() => updateMCPSettings({ enabled: value }), {
            successMessage: t('mcp.saveSuccess'),
            errorMessage: (res) => t('mcp.saveFail', { msg: res.msg }),
        })
        if (response?.code === API_SUCCESS_CODE) setSettings(response.data)
    }

    async function handleGenerate() {
        const response = await run(() => generateMCPToken(tokenScope), {
            successMessage: t('mcp.tokenGenerated'),
            errorMessage: (res) => t('mcp.generateFail', { msg: res.msg }),
        })
        if (response?.code === API_SUCCESS_CODE) {
            setTokenDialog(response.data.token)
            void refresh()
        }
    }

    async function handleDeleteToken(prefix: string) {
        const ok = await confirm({
            title: t('mcp.deleteTokenTitle'),
            content: t('mcp.deleteTokenContent', { prefix }),
        })
        if (!ok) return
        const response = await run(() => deleteMCPToken(prefix), {
            successMessage: t('mcp.tokenDeleted'),
            errorMessage: (res) => t('mcp.deleteFail', { msg: res.msg }),
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
            <Section title={t('mcp.sectionService')}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.enabled}
                            disabled={loading}
                            onChange={(event) => updateEnabled(event.target.checked)}
                        />
                    }
                    label={t('mcp.enableMcp')}
                />
                {!settings.enabled && (
                    <Typography variant="body2" color="text.secondary">
                        {t('mcp.mcpDisabledHint')}
                    </Typography>
                )}
            </Section>

            <Section title={t('mcp.sectionEndpoint')}>
                <TextField
                    value={endpoint}
                    fullWidth
                    size="small"
                    slotProps={{
                        input: {
                            readOnly: true,
                            endAdornment: (
                                <IconButton
                                    aria-label={t('mcp.copyEndpointAria')}
                                    edge="end"
                                    onClick={() => copyText(endpoint, t('mcp.endpointCopied'))}
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
                            ? t('mcp.tokensGeneratedHint', { count: settings.tokens.length })
                            : t('mcp.noTokensHint')}
                    </Typography>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        disabled={loading}
                        onClick={handleGenerate}
                    >
                        {t('mcp.generateToken')}
                    </Button>
                </Stack>
                <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                        {t('mcp.scopeLabel')}
                    </Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={tokenScope}
                        onChange={(_, value) => {
                            if (value) setTokenScope(value)
                        }}
                        disabled={loading}
                        aria-label={t('mcp.scopeLabel')}
                    >
                        <ToggleButton value="read">{t('mcp.scopeRead')}</ToggleButton>
                        <ToggleButton value="write">{t('mcp.scopeWrite')}</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary">
                        {tokenScope === 'read' ? t('mcp.scopeReadHint') : t('mcp.scopeWriteHint')}
                    </Typography>
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
                onCopy={(text) => copyText(text, t('mcp.tokenCopied'))}
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
    const { t } = useTranslation()
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('mcp.tokenDialogTitle')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="warning">{t('mcp.tokenDialogHint')}</Alert>
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
                                        aria-label={t('mcp.copyTokenAria')}
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
                    {t('mcp.iSaved')}
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
    const { t } = useTranslation()
    const envHint = t('mcp.envHint')
    const tabs = [
        { label: 'Codex', value: codexConfig(endpoint) },
        { label: 'Claude Code', value: claudeCodeCommand(endpoint) },
        { label: '.mcp.json', value: mcpJsonConfig(endpoint) },
    ]
    const [active, setActive] = useState(0)
    const current = tabs[active] ?? tabs[0]

    return (
        <Section title={t('mcp.sectionClient')}>
            <Typography variant="body2" color="text.secondary">
                {t('mcp.clientHint')}
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
                                aria-label={t('mcp.copyEnvAria')}
                                edge="end"
                                onClick={() => onCopy(envHint, t('mcp.envCopied'))}
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
                {t('mcp.copyConfig')}
            </Button>
        </Section>
    )
}
