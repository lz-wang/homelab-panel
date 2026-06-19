import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemIconGroup } from '@/types/panel'

function move<T>(list: T[], index: number, direction: -1 | 1) {
    const target = index + direction

    if (target < 0 || target >= list.length) return list

    const next = [...list]
    const current = next[index]
    next[index] = next[target]
    next[target] = current

    return next
}

export function GroupManager() {
    const notify = useNotify()
    const confirm = useConfirm()
    const storeGroups = usePanelStore((s) => s.groups)
    const upsertGroup = usePanelStore((s) => s.upsertGroup)
    const deleteGroups = usePanelStore((s) => s.deleteGroups)
    const replaceGroups = usePanelStore((s) => s.replaceGroups)
    const [groups, setGroups] = useState<ItemIconGroup[]>(storeGroups)
    const [savingSort, setSavingSort] = useState(false)
    const [editing, setEditing] = useState<ItemIconGroup | null>(null)
    const [title, setTitle] = useState('')
    const [savingGroup, setSavingGroup] = useState(false)

    useEffect(() => {
        setGroups(storeGroups)
    }, [storeGroups])

    function openEdit(group?: ItemIconGroup) {
        setEditing(group ?? {})
        setTitle(group?.title ?? '')
    }

    async function handleSaveGroup() {
        if (!title.trim()) {
            notify.error('分组名称不能为空')
            return
        }

        setSavingGroup(true)

        try {
            const res = await upsertGroup({
                ...editing,
                title: title.trim(),
            })

            if (res.code === 0) {
                notify.success(t('common.saveSuccess'))
                setEditing(null)
            } else {
                notify.error(`${t('common.saveFail')}:${res.msg}`)
            }
        } finally {
            setSavingGroup(false)
        }
    }

    async function handleDelete(group: ItemIconGroup) {
        if (!group.id) return

        const ok = await confirm({
            title: t('common.delete'),
            content: t('common.deleteConfirmByName', { name: group.title ?? '' }),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
        })

        if (!ok) return

        const res = await deleteGroups([group.id])

        if (res.code === 0) notify.success(t('common.deleteSuccess'))
        else notify.error(`${t('common.deleteFail')}:${res.msg}`)
    }

    async function handleSaveSort() {
        setSavingSort(true)

        try {
            const ordered = groups.map((group, index) => ({ ...group, sort: index + 1 }))
            const res = await replaceGroups(ordered)

            if (res.code === 0) notify.success(t('common.saveSuccess'))
            else notify.error(`${t('common.saveFail')}:${res.msg}`)
        } finally {
            setSavingSort(false)
        }
    }

    return (
        <Stack spacing={2}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    分组管理
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button startIcon={<AddIcon />} onClick={() => openEdit()}>
                        {t('common.add')}
                    </Button>
                    <Button startIcon={<SaveIcon />} loading={savingSort} onClick={handleSaveSort}>
                        保存排序
                    </Button>
                </Stack>
            </Stack>

            <List dense disablePadding>
                {groups.map((group, index) => (
                    <ListItem
                        key={group.id ?? index}
                        divider
                        secondaryAction={
                            <Stack direction="row" spacing={0.5}>
                                <Tooltip title="上移">
                                    <span>
                                        <IconButton
                                            disabled={index === 0}
                                            onClick={() =>
                                                setGroups((prev) => move(prev, index, -1))
                                            }
                                        >
                                            <ArrowUpwardIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="下移">
                                    <span>
                                        <IconButton
                                            disabled={index === groups.length - 1}
                                            onClick={() =>
                                                setGroups((prev) => move(prev, index, 1))
                                            }
                                        >
                                            <ArrowDownwardIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title={t('common.edit')}>
                                    <IconButton onClick={() => openEdit(group)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('common.delete')}>
                                    <IconButton onClick={() => handleDelete(group)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        }
                    >
                        <ListItemText
                            primary={group.title || '未命名分组'}
                            secondary={group.id ? `ID ${group.id}` : undefined}
                        />
                    </ListItem>
                ))}
            </List>

            {groups.length === 0 && <Typography color="text.secondary">暂无分组</Typography>}

            <Dialog
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{editing?.id ? t('common.edit') : t('common.add')}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="分组名称"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        fullWidth
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="text" disabled={savingGroup} onClick={() => setEditing(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button loading={savingGroup} onClick={handleSaveGroup}>
                        {t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    )
}
