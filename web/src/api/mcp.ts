import { del, get, post, put } from '@/api/request'

// 字段与后端 wire 格式一致（snake_case），不经 adapter 转换。
export interface MCPTokenInfo {
    prefix: string
    created_at?: string
    last_used_at?: string
}

export interface MCPSettings {
    enabled: boolean
    tokens: MCPTokenInfo[]
    updated_at?: string
}

export interface MCPTokenResponse {
    token: string
}

export interface UpdateMCPSettingsInput {
    enabled?: boolean
}

export function getMCPSettings() {
    return get<MCPSettings>({ url: '/mcp/settings' })
}

export function updateMCPSettings(input: UpdateMCPSettingsInput) {
    return put<MCPSettings>({ url: '/mcp/settings', data: input })
}

export function generateMCPToken() {
    return post<MCPTokenResponse>({ url: '/mcp/token' })
}

export function deleteMCPToken(prefix: string) {
    return del<MCPSettings>({ url: `/mcp/token/${encodeURIComponent(prefix)}` })
}
