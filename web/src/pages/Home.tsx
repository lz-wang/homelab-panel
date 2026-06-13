import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import LanIcon from '@mui/icons-material/Lan'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PublicIcon from '@mui/icons-material/Public'
import SaveIcon from '@mui/icons-material/Save'
import SettingsIcon from '@mui/icons-material/Settings'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Fab from '@mui/material/Fab'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'

import { deletes, getListByGroupId, saveSort } from '@/api/panel/itemIcon'
import { getList as getGroupList } from '@/api/panel/itemIconGroup'
import { AppStarter } from '@/components/apps/AppStarter'
import { AppIcon } from '@/components/common/AppIcon'
import { IframeDialog } from '@/components/common/IframeDialog'
import { useNotify } from '@/components/common/NotifyProvider'
import { Clock } from '@/components/desk/Clock'
import { SearchBox } from '@/components/desk/SearchBox'
import { SystemMonitor } from '@/components/desk/SystemMonitor'
import { VisitMode } from '@/constants/auth'
import { PanelPanelConfigStyleEnum, PanelStateNetworkModeEnum } from '@/constants/panel'
import { t } from '@/locales'
import { useAuthStore } from '@/store/auth'
import { usePanelStore } from '@/store/panel'
import type { ListResponse, SortItemRequest } from '@/types/common'
import type { ItemIconGroup, ItemInfo } from '@/types/panel'

interface ItemGroup extends ItemIconGroup {
  sortStatus?: boolean
  hoverStatus: boolean
  items?: ItemInfo[]
}

interface DragState {
  groupIndex: number
  itemIndex: number
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)

  return next
}

export default function Home() {
  const notify = useNotify()
  const authStore = useAuthStore()
  const { panelConfig, networkMode, setNetworkMode, updatePanelConfigByCloud } = usePanelStore()
  const [items, setItems] = useState<ItemGroup[]>([])
  const [keyword, setKeyword] = useState('')
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [iframe, setIframe] = useState({
    open: false,
    src: '',
    title: '',
  })
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
    item: ItemInfo | null
  } | null>(null)

  async function loadList() {
    const groupRes = await getGroupList()

    if (groupRes.code !== 0)
      return

    const groupData = groupRes.data as ListResponse<ItemGroup[]>
    const groups = groupData.list.map(group => ({
      ...group,
      hoverStatus: false,
      items: [],
    }))

    const withItems = await Promise.all(
      groups.map(async (group) => {
        if (!group.id)
          return group

        const itemRes = await getListByGroupId(group.id)
        const itemData = itemRes.data as ListResponse<ItemInfo[]>

        return {
          ...group,
          items: itemRes.code === 0 ? itemData.list : [],
        }
      }),
    )

    setItems(withItems)
  }

  useEffect(() => {
    loadList()
    updatePanelConfigByCloud()
  }, [])

  useEffect(() => {
    if (panelConfig.logoText)
      document.title = panelConfig.logoText
  }, [panelConfig.logoText])

  const filteredItems = useMemo(() => {
    const value = keyword.trim().toLowerCase()

    if (!value || !panelConfig.searchBoxSearchIcon)
      return items

    return items
      .map(group => ({
        ...group,
        items: group.items?.filter(item =>
          item.title.toLowerCase().includes(value)
          || item.url.toLowerCase().includes(value)
          || item.description?.toLowerCase().includes(value),
        ),
      }))
      .filter(group => group.items && group.items.length > 0)
  }, [items, keyword, panelConfig.searchBoxSearchIcon])

  function getItemUrl(item: ItemInfo) {
    if (networkMode === PanelStateNetworkModeEnum.lan && item.lanUrl)
      return item.lanUrl

    return item.url
  }

  function openPage(openMethod: number, url: string, title?: string) {
    if (openMethod === 1) {
      window.location.href = url
      return
    }

    if (openMethod === 2) {
      window.open(url)
      return
    }

    if (openMethod === 3) {
      setIframe({
        open: true,
        src: url,
        title: title || url,
      })
    }
  }

  function handleItemClick(groupIndex: number, item: ItemInfo) {
    const group = items[groupIndex]

    if (group?.sortStatus)
      return

    openPage(item.openMethod, getItemUrl(item), item.title)
  }

  function setGroupSortStatus(groupIndex: number, sortStatus: boolean) {
    setItems(prev => prev.map((group, index) => index === groupIndex ? { ...group, sortStatus } : group))
  }

  async function handleSaveSort(group: ItemGroup) {
    if (!group.id || !group.items)
      return

    const sortItems: SortItemRequest[] = group.items.map((item, index) => ({
      id: item.id as number,
      sort: index + 1,
    }))
    const res = await saveSort({ itemIconGroupId: group.id, sortItems })

    if (res.code === 0) {
      notify.success(t('common.saveSuccess'))
      setItems(prev => prev.map(item => item.id === group.id ? { ...item, sortStatus: false } : item))
    }
    else {
      notify.error(`${t('common.saveFail')}:${res.msg}`)
    }
  }

  async function handleDelete(item: ItemInfo) {
    if (!item.id)
      return

    // eslint-disable-next-line no-alert
    const ok = window.confirm(t('common.deleteConfirmByName', { name: item.title }))

    if (!ok)
      return

    const res = await deletes([item.id])

    if (res.code === 0) {
      notify.success(t('common.deleteSuccess'))
      loadList()
    }
    else {
      notify.error(`${t('common.deleteFail')}:${res.msg}`)
    }
  }

  function handleDrop(groupIndex: number, itemIndex: number) {
    if (!dragState || dragState.groupIndex !== groupIndex)
      return

    setItems(prev => prev.map((group, index) => {
      if (index !== groupIndex)
        return group

      return {
        ...group,
        items: reorder(group.items ?? [], dragState.itemIndex, itemIndex),
      }
    }))
    setDragState(null)
  }

  function handleChangeNetwork(mode: PanelStateNetworkModeEnum) {
    setNetworkMode(mode)
    notify.success(
      mode === PanelStateNetworkModeEnum.lan
        ? t('panelHome.changeToLanModelSuccess')
        : t('panelHome.changeToWanModelSuccess'),
    )
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
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h3" color="white" sx={{ fontWeight: 700, textShadow: '2px 2px 50px #000' }}>
              {panelConfig.logoText}
            </Typography>
            <Typography color="white">|</Typography>
            <Clock hideSecond={!panelConfig.clockShowSecond} />
          </Stack>

          {panelConfig.searchBoxShow && (
            <Box sx={{ mt: 3, mx: 'auto', maxWidth: 900 }}>
              <SearchBox onSearch={setKeyword} />
            </Box>
          )}

          <Box sx={{ mx: `${panelConfig.marginX ?? 5}px` }}>
            {panelConfig.systemMonitorShow
              && ((panelConfig.systemMonitorPublicVisitModeShow && authStore.visitMode === VisitMode.VISIT_MODE_PUBLIC)
                || authStore.visitMode === VisitMode.VISIT_MODE_LOGIN) && (
              <SystemMonitor showTitle={panelConfig.systemMonitorShowTitle} />
            )}

            {filteredItems.map((group, groupIndex) => (
              <Box
                key={group.id ?? groupIndex}
                sx={{
                  mt: 6,
                  p: group.sortStatus ? 1.25 : 0,
                  borderRadius: 2,
                  boxShadow: group.sortStatus ? '0 0 30px 10px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                  <Typography color="white" variant="h6" sx={{ fontWeight: 800, textShadow: '2px 2px 50px #000' }}>
                    {group.title}
                  </Typography>
                  {authStore.visitMode === VisitMode.VISIT_MODE_LOGIN && (
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={t('common.add')}>
                        <Fab size="small" color="default">
                          <AddIcon fontSize="small" />
                        </Fab>
                      </Tooltip>
                      <Tooltip title={t('common.sort')}>
                        <Fab size="small" color="default" onClick={() => setGroupSortStatus(groupIndex, !group.sortStatus)}>
                          <DragIndicatorIcon fontSize="small" />
                        </Fab>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns:
                      panelConfig.iconStyle === PanelPanelConfigStyleEnum.info
                        ? 'repeat(auto-fill, minmax(200px, 1fr))'
                        : 'repeat(auto-fill, minmax(75px, 1fr))',
                    gap: 2.25,
                  }}
                >
                  {group.items?.map((item, itemIndex) => (
                    <Box
                      key={item.id ?? itemIndex}
                      draggable={Boolean(group.sortStatus)}
                      onDragStart={() => setDragState({ groupIndex, itemIndex })}
                      onDragOver={event => event.preventDefault()}
                      onDrop={() => handleDrop(groupIndex, itemIndex)}
                      onClick={() => handleItemClick(groupIndex, item)}
                      onContextMenu={(event) => {
                        if (group.sortStatus)
                          return

                        event.preventDefault()
                        setContextMenu({
                          mouseX: event.clientX,
                          mouseY: event.clientY,
                          item,
                        })
                      }}
                    >
                      <AppIcon
                        item={item}
                        style={panelConfig.iconStyle ?? PanelPanelConfigStyleEnum.icon}
                        iconTextColor={panelConfig.iconTextColor ?? '#ffffff'}
                        hideDescription={panelConfig.iconTextInfoHideDescription ?? false}
                        hideTitle={panelConfig.iconTextIconHideTitle ?? false}
                      />
                    </Box>
                  ))}
                </Box>

                {group.sortStatus && (
                  <Button sx={{ mt: 2 }} startIcon={<SaveIcon />} onClick={() => handleSaveSort(group)}>
                    {t('common.saveSort')}
                  </Button>
                )}
              </Box>
            ))}
          </Box>

          {panelConfig.footerHtml && (
            <Box sx={{ mt: 5 }} dangerouslySetInnerHTML={{ __html: panelConfig.footerHtml }} />
          )}
        </Box>
      </Box>

      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem
          onClick={() => {
            if (contextMenu?.item)
              window.open(getItemUrl(contextMenu.item))
            setContextMenu(null)
          }}
        >
          <OpenInNewIcon fontSize="small" style={{ marginRight: 8 }} />
          {t('iconItem.newWindowOpen')}
        </MenuItem>
        {contextMenu?.item?.lanUrl && networkMode === PanelStateNetworkModeEnum.wan && (
          <MenuItem
            onClick={() => {
              if (contextMenu.item)
                openPage(contextMenu.item.openMethod, contextMenu.item.lanUrl as string, contextMenu.item.title)
              setContextMenu(null)
            }}
          >
            <LanIcon fontSize="small" style={{ marginRight: 8 }} />
            {t('panelHome.openLanUrl')}
          </MenuItem>
        )}
        {contextMenu?.item?.lanUrl && networkMode === PanelStateNetworkModeEnum.lan && (
          <MenuItem
            onClick={() => {
              if (contextMenu.item)
                openPage(contextMenu.item.openMethod, contextMenu.item.url, contextMenu.item.title)
              setContextMenu(null)
            }}
          >
            <PublicIcon fontSize="small" style={{ marginRight: 8 }} />
            {t('panelHome.openWanUrl')}
          </MenuItem>
        )}
        {authStore.visitMode === VisitMode.VISIT_MODE_LOGIN && (
          <MenuItem
            onClick={() => {
              if (contextMenu?.item)
                handleDelete(contextMenu.item)
              setContextMenu(null)
            }}
          >
            <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
            {t('common.delete')}
          </MenuItem>
        )}
      </Menu>

      <Stack spacing={1} sx={{ position: 'fixed', right: 10, bottom: 50 }}>
        <Tooltip title="设置">
          <Fab size="small" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </Fab>
        </Tooltip>
        {panelConfig.netModeChangeButtonShow && (
          <Tooltip title={networkMode === PanelStateNetworkModeEnum.lan ? t('panelHome.changeToWanModel') : t('panelHome.changeToLanModel')}>
            <Fab
              size="small"
              onClick={() => {
                handleChangeNetwork(
                  networkMode === PanelStateNetworkModeEnum.lan
                    ? PanelStateNetworkModeEnum.wan
                    : PanelStateNetworkModeEnum.lan,
                )
              }}
            >
              {networkMode === PanelStateNetworkModeEnum.lan ? <PublicIcon /> : <LanIcon />}
            </Fab>
          </Tooltip>
        )}
      </Stack>

      <IframeDialog
        open={iframe.open}
        title={iframe.title}
        src={iframe.src}
        onClose={() => setIframe({ open: false, src: '', title: '' })}
      />
      <AppStarter open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  )
}
