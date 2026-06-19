import type { ApiResponse } from '@/api/apiResult'

export interface SessionStatus {
    ok: boolean
}

export async function validateSession(token: string): Promise<ApiResponse<SessionStatus>> {
    const response = await fetch('/api/v1/admin/session', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
    const data = await readJson(response)

    if (response.ok) {
        if (isApiResponse<SessionStatus>(data)) return data

        return {
            code: 0,
            msg: 'OK',
            data: { ok: Boolean((data as Partial<SessionStatus> | null)?.ok) },
        }
    }

    if (isApiResponse<SessionStatus>(data)) return data

    return {
        code: response.status,
        msg: errorMessage(data) ?? `服务器错误(${response.status})`,
        data: { ok: false },
    }
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json()
    } catch {
        return null
    }
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
    if (!value || typeof value !== 'object') return false

    const candidate = value as Partial<ApiResponse<T>>

    return (
        typeof candidate.code === 'number' &&
        typeof candidate.msg === 'string' &&
        'data' in candidate
    )
}

function errorMessage(value: unknown) {
    if (!value || typeof value !== 'object') return null

    const candidate = value as { error?: unknown; msg?: unknown; message?: unknown }
    if (typeof candidate.error === 'string') return candidate.error
    if (typeof candidate.msg === 'string') return candidate.msg
    if (typeof candidate.message === 'string') return candidate.message

    return null
}
