import { del, get, post, put } from '@/api/request'

export type MCPScope = 'read_only' | 'read_write'

export interface MCPTokenInfo {
    prefix: string
    createdAt?: string
    lastUsedAt?: string
}

export interface MCPSettings {
    enabled: boolean
    scope: MCPScope
    tokens: MCPTokenInfo[]
    updatedAt?: string
}

export interface MCPTokenResponse {
    token: string
    tokenPrefix: string
}

export interface UpdateMCPSettingsInput {
    enabled?: boolean
    scope?: MCPScope
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
