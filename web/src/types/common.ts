export interface ListResponse<T> {
  list: T
  count: number
}

export interface InfoBase {
  createTime?: string
  updateTime?: string
  id?: number
}

export interface SortItemRequest {
  id: number
  sort: number
}
