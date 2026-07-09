import AddIcon from '@mui/icons-material/Add'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { logout } from '@/api/admin'
import { AppStarter } from '@/components/apps/AppStarter'
import { EditItemDialog } from '@/components/common/EditItemDialog'
import { useTranslation } from '@/locales'
import { useAuthStore } from '@/store/auth'
import { usePanelStore } from '@/store/panel'
import type { ItemInfo } from '@/types/panel'

import { HomeContextMenu, type HomeContextMenuState } from './home/HomeContextMenu'
import { HomeFloatingActions } from './home/HomeFloatingActions'
import { HomeGroup } from './home/HomeGroup'
import { HomeHeader } from './home/HomeHeader'
import type { ItemGroup } from './home/types'
import { useHomeActions } from './home/useHomeActions'
import { useHomeData } from './home/useHomeData'
import { useHomeSearch } from './home/useHomeSearch'
import { useHomeSort } from './home/useHomeSort'

// 浏览模式（已登录管理员临时切到只读）是否开启，持久化以在刷新后保持。
const BROWSING_AS_GUEST_KEY = 'homelab-panel:browsing-as-guest'

export default function Home() {
    const navigate = useNavigate()
    const authStore = useAuthStore()
    const { t } = useTranslation()
    const { panelConfig, panelDataVersion, load: loadPanel } = usePanelStore()
    const { items, setItems, loading, loadList } = useHomeData()
    const { setKeyword, filteredItems, isSearchActive } = useHomeSearch(items)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [contextMenu, setContextMenu] = useState<HomeContextMenuState | null>(null)
    const [browsingAsGuest, setBrowsingAsGuest] = useState(() => {
        // 仅登录管理员恢复浏览模式；未登录无意义（本就不能编辑）。
        const isAdmin = Boolean(authStore.token) && authStore.isAdmin
        return isAdmin && localStorage.getItem(BROWSING_AS_GUEST_KEY) === '1'
    })
    const loggedInAsAdmin = Boolean(authStore.token) && authStore.isAdmin
    const canManage = loggedInAsAdmin && !browsingAsGuest

    const {
        editItemOpen,
        setEditItemOpen,
        editItem,
        addItemIconGroupId,
        creatingFirstGroup,
        handleItemClick,
        handleOpenBackupUrl,
        handleDelete,
        handleCopyItem,
        handleEditItem,
        handleAddItem,
        handleAddFirstItem,
    } = useHomeActions({
        canManage,
        items,
        loadList,
    })

    const { setDragState, setGroupSortStatus, handleSaveSort, handleCancelSort, handleDrop } =
        useHomeSort({
            canManage,
            isSearchActive,
            items,
            setItems,
        })

    useEffect(() => {
        loadPanel()
    }, [loadPanel])

    // biome-ignore lint/correctness/useExhaustiveDependencies: panelDataVersion intentionally forces public list reloads after edits.
    useEffect(() => {
        loadList()
    }, [loadList, panelDataVersion])

    useEffect(() => {
        if (panelConfig.logoText) document.title = panelConfig.logoText
    }, [panelConfig.logoText])

    // 浏览模式开关持久化到 localStorage，刷新后保持上次状态。
    useEffect(() => {
        try {
            if (browsingAsGuest) localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')
            else localStorage.removeItem(BROWSING_AS_GUEST_KEY)
        } catch {
            // localStorage 不可用时静默忽略
        }
    }, [browsingAsGuest])

    useEffect(() => {
        if (loggedInAsAdmin) return

        setBrowsingAsGuest(false)
        setSettingsOpen(false)
        setContextMenu(null)
        setEditItemOpen(false)
    }, [loggedInAsAdmin, setEditItemOpen])

    useEffect(() => {
        if (!browsingAsGuest) return

        setSettingsOpen(false)
        setContextMenu(null)
        setEditItemOpen(false)
    }, [browsingAsGuest, setEditItemOpen])

    function getSourceGroupIndex(group: ItemGroup, fallbackIndex: number) {
        if (!group.id) return fallbackIndex

        const index = items.findIndex((item) => item.id === group.id)

        return index >= 0 ? index : fallbackIndex
    }

    function handleContextMenu(event: React.MouseEvent, item: ItemInfo, sorting?: boolean) {
        if (sorting) return

        // 编辑模式：右键打开编辑/复制/删除菜单（保持原行为）。
        if (canManage) {
            event.preventDefault()
            setContextMenu({
                mouseX: event.clientX,
                mouseY: event.clientY,
                item,
            })
            return
        }

        // 浏览模式：右键打开备用链接；无则顶部通知。
        event.preventDefault()
        handleOpenBackupUrl(item)
    }

    async function handleLogout() {
        try {
            await logout()
        } finally {
            authStore.clearToken()
            setBrowsingAsGuest(false)
            setSettingsOpen(false)
            setContextMenu(null)
            setEditItemOpen(false)
            navigate('/login')
        }
    }

    return (
        <Box sx={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'scale(1.05)',
                    filter: `blur(${panelConfig.backgroundBlur ?? 0}px)`,
                    background: `url(${panelConfig.backgroundImageSrc}) center / cover no-repeat`,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: `rgba(0,0,0,${panelConfig.backgroundMaskNumber ?? 0})`,
                }}
            />
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
                <Box
                    sx={{
                        p: 2,
                        mx: 'auto',
                        mt: `${panelConfig.marginTop ?? 3}%`,
                        mb: `${panelConfig.marginBottom ?? 2}%`,
                    }}
                >
                    <HomeHeader panelConfig={panelConfig} onSearch={setKeyword} />

                    <Box sx={{ mx: `${panelConfig.marginX ?? 5}%` }}>
                        {!loading && !isSearchActive && items.length === 0 && (
                            <Paper
                                elevation={0}
                                sx={{
                                    mt: 6,
                                    p: 4,
                                    border: '1px dashed rgba(255,255,255,0.35)',
                                    borderRadius: 3,
                                    bgcolor: 'rgba(15,23,42,0.45)',
                                    color: 'white',
                                    textAlign: 'center',
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                    {t('home.emptyTitle')}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ mt: 1, mb: 3, color: 'rgba(255,255,255,0.72)' }}
                                >
                                    {t('home.emptyHint')}
                                </Typography>
                                {canManage ? (
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        loading={creatingFirstGroup}
                                        onClick={handleAddFirstItem}
                                    >
                                        {t('home.addFirstApp')}
                                    </Button>
                                ) : (
                                    <Tooltip title={t('home.guestHint')} placement="bottom">
                                        <span>
                                            <Button
                                                variant="contained"
                                                startIcon={<AddIcon />}
                                                disabled
                                            >
                                                {t('home.addFirstApp')}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                )}
                            </Paper>
                        )}

                        {filteredItems.map((group, groupIndex) => {
                            const sourceGroupIndex = getSourceGroupIndex(group, groupIndex)

                            return (
                                <HomeGroup
                                    key={group.id ?? groupIndex}
                                    group={group}
                                    sourceGroupIndex={sourceGroupIndex}
                                    canManage={canManage}
                                    isSearchActive={isSearchActive}
                                    panelConfig={panelConfig}
                                    onAddItem={handleAddItem}
                                    onToggleSort={setGroupSortStatus}
                                    onSaveSort={handleSaveSort}
                                    onCancelSort={handleCancelSort}
                                    onDragStart={(groupIndex, itemIndex) =>
                                        setDragState({ groupIndex, itemIndex })
                                    }
                                    onDrop={handleDrop}
                                    onItemClick={handleItemClick}
                                    onItemEdit={handleEditItem}
                                    onContextMenu={handleContextMenu}
                                />
                            )
                        })}
                    </Box>
                </Box>
            </Box>

            <HomeContextMenu
                contextMenu={contextMenu}
                canManage={canManage}
                onClose={() => setContextMenu(null)}
                onEdit={handleEditItem}
                onCopy={handleCopyItem}
                onDelete={handleDelete}
            />

            <HomeFloatingActions
                canManage={loggedInAsAdmin}
                browsingAsGuest={browsingAsGuest}
                onOpenSettings={() => setSettingsOpen(true)}
                onLogin={() => navigate('/login')}
                onToggleBrowseMode={() => setBrowsingAsGuest((value) => !value)}
                onLogout={handleLogout}
            />

            {loggedInAsAdmin && (
                <AppStarter open={settingsOpen} onClose={() => setSettingsOpen(false)} />
            )}
            {canManage && (
                <EditItemDialog
                    open={editItemOpen}
                    item={editItem}
                    itemIconGroupId={addItemIconGroupId}
                    onClose={() => setEditItemOpen(false)}
                    onSaved={loadList}
                />
            )}
        </Box>
    )
}
