import { useCallback, useState } from 'react'

import { type ApiResponse, API_SUCCESS_CODE } from '@/api/apiResult'
import { useNotify } from '@/components/common/NotifyProvider'

type MessageBuilder<T> = string | ((response: ApiResponse<T>) => string)

interface ApiActionOptions<T> {
  successMessage?: MessageBuilder<T>
  errorMessage?: MessageBuilder<T>
}

function resolveMessage<T>(message: MessageBuilder<T> | undefined, response: ApiResponse<T>) {
  return typeof message === 'function' ? message(response) : message
}

export function useApiAction() {
  const notify = useNotify()
  const [loading, setLoading] = useState(false)

  const run = useCallback(async <T>(
    action: () => Promise<ApiResponse<T>>,
    options: ApiActionOptions<T> = {},
  ) => {
    setLoading(true)

    try {
      const response = await action()

      if (response.code === API_SUCCESS_CODE) {
        const successMessage = resolveMessage(options.successMessage, response)

        if (successMessage)
          notify.success(successMessage)
      }
      else {
        const errorMessage = resolveMessage(options.errorMessage, response) ?? response.msg

        notify.error(errorMessage)
      }

      return response
    }
    catch {
      notify.error('请求失败')
      return null
    }
    finally {
      setLoading(false)
    }
  }, [notify])

  return {
    loading,
    run,
  }
}
