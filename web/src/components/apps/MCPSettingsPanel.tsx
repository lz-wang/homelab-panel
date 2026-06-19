import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'

import {
    type MCPScope,
    type MCPSettings,
    deleteMCPToken,
    generateMCPToken,
    getMCPSettings,
    resetMCPToken,
    updateMCPSettings,
} from '@/api/mcp'
import { API_SUCCESS_CODE } from '@/api/apiResult'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { useApiAction } from '@/hooks/useApiAction'

function mcpEndpoint() {
    return `${window.location.origin}/api/v1/mcp`
}

function formatTime(value?: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('zh-CN', { hour12: false })
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

export function MCPSettingsPanel() {
    const { loading, run } = useApiAction()
    const confirm = useConfirm()
    const notify = useNotify()

    const [settings, setSettings] = useState<MCPSettings | null>(null)
    const [tokenDialog, setTokenDialog] = useState<{ token: string; prefix: string } | null>(null)

    const refresh = useCallback(async () => {
        const response = await getMCPSettings()
        if (response.code === API_SUCCESS_CODE) setSettings(response.data)
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    async function copyText(text: string, hint = '已复制') {
        try {
            await navigator.clipboard.writeText(text)
            notify.success(hint)
        } catch {
            notify.error('复制失败，请手动选择复制')
        }
    }

    async function updateField(field: 'enabled' | 'scope', value: boolean | MCPScope) {
        const response = await run(() => updateMCPSettings({ [field]: value }), {
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
            setTokenDialog({ token: response.data.token, prefix: response.data.tokenPrefix })
            void refresh()
        }
    }

    async function handleReset() {
        const ok = await confirm({
            title: '重置 Token',
            content: '重置后旧 Token 立即失效，已接入的客户端需更新配置。确定继续？',
        })
        if (!ok) return
        const response = await run(() => resetMCPToken(), {
            successMessage: 'Token 已重置',
            errorMessage: (res) => `重置失败:${res.msg}`,
        })
        if (response?.code === API_SUCCESS_CODE) {
            setTokenDialog({ token: response.data.token, prefix: response.data.tokenPrefix })
            void refresh()
        }
    }

    async function handleDelete() {
        const ok = await confirm({
            title: '删除 Token',
            content: '删除 Token 将同时禁用 MCP 服务。确定继续？',
        })
        if (!ok) return
        const response = await run(() => deleteMCPToken(), {
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
                            onChange={(event) => updateField('enabled', event.target.checked)}
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

            <Section title="权限范围">
                <RadioGroup
                    row
                    value={settings.scope}
                    onChange={(event) => updateField('scope', event.target.value as MCPScope)}
                >
                    <FormControlLabel
                        value="read_only"
                        control={<Radio disabled={loading} />}
                        label="只读（仅查询）"
                    />
                    <FormControlLabel
                        value="read_write"
                        control={<Radio disabled={loading} />}
                        label="读写（可增删改）"
                    />
                </RadioGroup>
            </Section>

            <Section title="接入地址">
                <TextField
                    value={endpoint}
                    fullWidth
                    size="small"
                    slotProps={{ input: { readOnly: true } }}
                />
                <Button
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => copyText(endpoint, '接入地址已复制')}
                >
                    复制地址
                </Button>
            </Section>

            <Section title="Token">
                {settings.hasToken ? (
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <VpnKeyOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                                前缀：<code>{settings.tokenPrefix}</code>
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            创建时间：{formatTime(settings.createdAt)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            最近使用：{formatTime(settings.lastUsedAt)}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<RefreshOutlinedIcon />}
                                disabled={loading}
                                onClick={handleReset}
                            >
                                重置 Token
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteOutlinedIcon />}
                                disabled={loading}
                                onClick={handleDelete}
                            >
                                删除 Token
                            </Button>
                        </Stack>
                    </Stack>
                ) : (
                    <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                            尚未生成 Token，生成后将自动启用 MCP 服务。
                        </Typography>
                        <Box>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddOutlinedIcon />}
                                disabled={loading}
                                onClick={handleGenerate}
                            >
                                生成 Token
                            </Button>
                        </Box>
                    </Stack>
                )}
            </Section>

            <TokenRevealDialog
                open={tokenDialog !== null}
                token={tokenDialog?.token ?? ''}
                prefix={tokenDialog?.prefix ?? ''}
                onCopy={(text) => copyText(text, 'Token 已复制')}
                onClose={() => setTokenDialog(null)}
            />
        </Stack>
    )
}

function TokenRevealDialog({
    open,
    token,
    prefix,
    onCopy,
    onClose,
}: {
    open: boolean
    token: string
    prefix: string
    onCopy: (text: string) => void
    onClose: () => void
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Token 已生成
                <IconButton
                    aria-label="复制"
                    onClick={() => onCopy(token)}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <ContentCopyIcon />
                </IconButton>
            </DialogTitle>
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
                    <Typography variant="body2" color="text.secondary">
                        前缀：<code>{prefix}</code>
                    </Typography>
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
