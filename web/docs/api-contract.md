# API Contract Checklist

This file tracks frontend wrapper shapes that must stay aligned with backend binding structs.

## Panel item icons

- `POST /panel/itemIcon/addMultiple`
  - Frontend: `addMultiple(data: ItemInfo[])`
  - Backend: binds `[]models.ItemIcon`
  - Required per item: `itemIconGroupId`, `title`, `url`, `openMethod`, `icon`
  - Notes: this is not `{ itemIconGroupId, urls }`; batch URL input must be converted to `ItemInfo[]` before calling the API.

## Files

- `POST /file/uploadImg`
  - Frontend field: `imgfile`
  - Response data: `{ imageUrl: string }`
- `POST /file/uploadFiles`
  - Frontend field: `files[]`
  - Response data: `{ succMap: Record<string, string>, errFiles: string[] }`
- `POST /file/getList`
  - Response data: `{ list: FileInfo[], count: number }`
- `POST /file/deletes`
  - Request data: `{ ids: number[] }`

## Users

- `POST /panel/users/getList`
  - Request data: `{ page: number, limit: number, keyword?: string }`
  - Response data: paged user list
- `POST /panel/users/setPublicVisitUser`
  - Request data: `{ userId: number }`
  - Admin-only endpoint

## Module config

- `POST /system/moduleConfig/getByName`
  - Request data: `{ name: string }`
  - Response data: the saved `value` object or `null`
- `POST /system/moduleConfig/save`
  - Request data: `{ name: string, value: object }`
  - Notes: backend stores `value` as JSON in `valueJson`.

## System monitor

- `POST /system/monitor/getAll`
  - Response data: `SystemMonitorSnapshot`
- `POST /system/monitor/getDiskMountpoints`
  - Response data: `string[]`
