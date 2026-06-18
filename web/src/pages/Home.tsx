import AddIcon from '@mui/icons-material/Add'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppStarter } from '@/components/apps/AppStarter'
import { BatchAddItemsDialog } from '@/components/common/BatchAddItemsDialog'
import { EditItemDialog } from '@/components/common/EditItemDialog'
import { IframeDialog } from '@/components/common/IframeDialog'
import { useAuthStore } from '@/store/auth'
import { usePanelStore } from '@/store/panel'
import type { ItemInfo } from '@/types/panel'

import { HomeContextMenu, type HomeContextMenuState } from './home/HomeContextMenu'
import { HomeFloatingActions } from './home/HomeFloatingActions'
import { HomeGroup } from './home/HomeGroup'
import { HomeHeader } from './home/HomeHeader'
import { useHomeActions } from './home/useHomeActions'
import { useHomeData } from './home/useHomeData'
import { useHomeSearch } from './home/useHomeSearch'
import { useHomeSort } from './home/useHomeSort'
import type { ItemGroup } from './home/types'

export default function Home() {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const { panelConfig, networkMode, panelDataVersion, setNetworkMode, load: loadPanel } = usePanelStore()
  const { items, setItems, loadList } = useHomeData()
  const { setKeyword, filteredItems, isSearchActive } = useHomeSearch(items, panelConfig)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [batchAddGroupId, setBatchAddGroupId] = useState<number | undefined>()
  const [contextMenu, setContextMenu] = useState<HomeContextMenuState | null>(null)
  const canManage = Boolean(authStore.token) && authStore.isAdmin

  const {
    iframe,
    setIframe,
    editItemOpen,
    setEditItemOpen,
    editItem,
    addItemIconGroupId,
    creatingFirstGroup,
    getItemUrl,
    openPage,
    handleItemClick,
    handleDelete,
    handleChangeNetwork,
    handleEditItem,
    handleAddItem,
    handleAddFirstItem,
  } = useHomeActions({
    canManage,
    items,
    loadList,
    networkMode,
    setNetworkMode,
  })

  const {
    setDragState,
    setGroupSortStatus,
    handleSaveSort,
    handleCancelSort,
    handleDrop,
  } = useHomeSort({
    canManage,
    isSearchActive,
    items,
    setItems,
  })

  useEffect(() => {
    loadPanel()
  }, [loadPanel])

  useEffect(() => {
    loadList()
  }, [loadList, panelDataVersion])

  useEffect(() => {
    if (panelConfig.logoText)
      document.title = panelConfig.logoText
  }, [panelConfig.logoText])

  function getSourceGroupIndex(group: ItemGroup, fallbackIndex: number) {
    if (!group.id)
      return fallbackIndex

    const index = items.findIndex(item => item.id === group.id)

    return index >= 0 ? index : fallbackIndex
  }

  function handleContextMenu(event: React.MouseEvent, item: ItemInfo, sorting?: boolean) {
    if (sorting)
      return

    event.preventDefault()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      item,
    })
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
            mt: `${panelConfig.marginTop ?? 10}%`,
            mb: `${panelConfig.marginBottom ?? 10}%`,
            maxWidth: `${panelConfig.maxWidth ?? 1200}${panelConfig.maxWidthUnit}`,
          }}
        >
          <HomeHeader panelConfig={panelConfig} onSearch={setKeyword} />

          <Box sx={{ mx: `${panelConfig.marginX ?? 5}px` }}>
            {canManage && !isSearchActive && items.length === 0 && (
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
                  还没有应用
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, mb: 3, color: 'rgba(255,255,255,0.72)' }}>
                  添加第一个应用时会自动创建默认分组，之后可以在设置中调整分组。
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  loading={creatingFirstGroup}
                  onClick={handleAddFirstItem}
                >
                  添加第一个应用
                </Button>
              </Paper>
            )}

            {filteredItems.map((group, groupIndex) => {
              const sourceGroupIndex = getSourceGroupIndex(group, groupIndex)

              return (
                <HomeGroup
                  key={group.id ?? groupIndex}
                  group={group}
                  groupIndex={groupIndex}
                  sourceGroupIndex={sourceGroupIndex}
                  canManage={canManage}
                  isSearchActive={isSearchActive}
                  panelConfig={panelConfig}
                  onAddItem={handleAddItem}
                  onBatchAdd={setBatchAddGroupId}
                  onToggleSort={setGroupSortStatus}
                  onSaveSort={handleSaveSort}
                  onCancelSort={handleCancelSort}
                  onDragStart={(groupIndex, itemIndex) => setDragState({ groupIndex, itemIndex })}
                  onDrop={handleDrop}
                  onItemClick={handleItemClick}
                  onContextMenu={handleContextMenu}
                />
              )
            })}
          </Box>

          {panelConfig.footerHtml && (
            <Box sx={{ mt: 5 }} dangerouslySetInnerHTML={{ __html: panelConfig.footerHtml }} />
          )}
        </Box>
      </Box>

      <HomeContextMenu
        contextMenu={contextMenu}
        canManage={canManage}
        networkMode={networkMode}
        onClose={() => setContextMenu(null)}
        getItemUrl={getItemUrl}
        openPage={openPage}
        onEdit={handleEditItem}
        onDelete={handleDelete}
      />

      <HomeFloatingActions
        canManage={canManage}
        networkMode={networkMode}
        showNetworkToggle={panelConfig.netModeChangeButtonShow}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogin={() => navigate('/login')}
        onChangeNetwork={handleChangeNetwork}
      />

      <IframeDialog
        open={iframe.open}
        title={iframe.title}
        src={iframe.src}
        onClose={() => setIframe({ open: false, src: '', title: '' })}
      />
      <AppStarter open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <EditItemDialog
        open={editItemOpen}
        item={editItem}
        itemIconGroupId={addItemIconGroupId}
        onClose={() => setEditItemOpen(false)}
        onSaved={loadList}
      />
      <BatchAddItemsDialog
        open={Boolean(batchAddGroupId)}
        itemIconGroupId={batchAddGroupId}
        onClose={() => setBatchAddGroupId(undefined)}
        onSaved={loadList}
      />
    </Box>
  )
}
