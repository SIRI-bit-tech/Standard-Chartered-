import axios, { AxiosInstance, AxiosError } from 'axios'
import { API_BASE_URL } from '@/constants'
import { useLoadingStore } from '@/lib/store'

interface ApiClientConfig {
  baseURL: string
  timeout?: number
}

class ApiClient {
  private client: AxiosInstance
  private inMemoryToken: string | null = null

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })

    let isRefreshing = false
    let refreshPromise: Promise<string> | null = null

    const performRefresh = async (): Promise<string> => {
      if (refreshPromise) return refreshPromise
      isRefreshing = true
      // No need to pass refresh_token in body anymore, backend reads it from httpOnly cookie
      refreshPromise = axios
        .post(`${API_BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
        .then((res) => {
          const data: any = res.data
          const newAccess: string = data?.access_token
          if (!newAccess) throw new Error('No access token in refresh response')

          this.setAuthToken(newAccess)
          return newAccess
        })
        .finally(() => {
          isRefreshing = false
          refreshPromise = null
        })
      return refreshPromise
    }

    // Request interceptor to attach token from in-memory variable
    this.client.interceptors.request.use((cfg) => {
      try {
        const showLoaderHeader =
          (cfg.headers as any)?.['X-Show-Loader'] === '1' ||
          (cfg as any)?.meta?.showLoader === true
        if (showLoaderHeader && typeof window !== 'undefined') {
          try {
            useLoadingStore.getState().show()
              ; (cfg as any)._showLoader = true
          } catch { }
        }

        if (this.inMemoryToken) {
          cfg.headers = cfg.headers || {}
            ; (cfg.headers as any)['Authorization'] = `Bearer ${this.inMemoryToken}`
        }
      } catch {
        // no-op
      }
      return cfg
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if ((response.config as any)._showLoader && typeof window !== 'undefined') {
          try {
            useLoadingStore.getState().hide()
          } catch { }
        }
        return response
      },
      async (error: AxiosError) => {
        if ((error.config as any)?._showLoader && typeof window !== 'undefined') {
          try {
            useLoadingStore.getState().hide()
          } catch { }
        }
        const status = error.response?.status
        const failingUrl: string = (error.config?.url as string) || ''
        const isAdminRequest = typeof failingUrl === 'string' && failingUrl.startsWith('/admin')
        const isAuthEndpoint = failingUrl.includes('/auth/')
        if (!status || status >= 500) {
          console.error('[API Error]', error.message)
          if (error.code === 'ECONNABORTED') {
            console.error('[API Error] Request timeout - backend not responding')
          }
        } else if (status === 401 || status === 403) {
          // Try silent refresh once before forcing logout
          try {
            const cfg: any = error.config || {}
            if (!cfg._retry && typeof window !== 'undefined' && !isAdminRequest && !isAuthEndpoint) {
              cfg._retry = true
              if (!isRefreshing) {
                await performRefresh()
              } else if (refreshPromise) {
                await refreshPromise
              }
              // Retry original request with new token
              return this.client.request(cfg)
            }
          } catch {
            // fall through to logout handling
          }
          // As a last attempt, if another tab/process refreshed the token very recently,
          // retry once using the latest token from storage.
          try {
            const cfg: any = error.config || {}
            if (!cfg._retry_after_external_refresh && typeof window !== 'undefined') {
              const updatedAt = Number(window.localStorage.getItem('access_token_updated_at') || 0)
              const justUpdated = Date.now() - updatedAt < 8000
              const latest = window.localStorage.getItem('access_token')
              if (justUpdated && latest) {
                cfg._retry_after_external_refresh = true
                this.setAuthToken(latest)
                return this.client.request(cfg)
              }
            }
          } catch { }
          // Avoid redirect loops while already on an auth page or when the auth endpoint itself fails
          if (typeof window !== 'undefined') {
            const onAdminAuthPage = window.location.pathname.startsWith('/admin/auth')
            const onUserAuthPage = window.location.pathname.startsWith('/auth/')
            if (onAdminAuthPage && isAdminRequest && isAuthEndpoint) {
              return Promise.reject(error)
            }
            if (onUserAuthPage && !isAdminRequest && isAuthEndpoint) {
              return Promise.reject(error)
            }
            // If we are in admin UI but the failing request is NOT an admin endpoint,
            // do not clear admin session or redirect. Let the request fail silently.
            if (window.location.pathname.startsWith('/admin') && !isAdminRequest) {
              return Promise.reject(error)
            }
          }
          try {
            const detail = (error.response?.data as any)?.detail
            if (detail) {
              try {
                console.warn('[Auth Error]', detail)
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('auth_error', typeof detail === 'string' ? detail : 'Unauthorized')
                }
              } catch { }
            }
            if (typeof window !== 'undefined') {
              try {
                const reqUrl = (error.config?.url as string) || ''
                const isAdminCtx = window.location.pathname.startsWith('/admin') || reqUrl.startsWith('/admin')
                if (isAdminCtx) {
                  window.localStorage.removeItem('admin_token')
                  window.localStorage.removeItem('admin_refresh_token')
                  window.localStorage.removeItem('admin_id')
                  window.localStorage.removeItem('admin_email')
                  window.localStorage.removeItem('admin_name')
                  document.cookie = 'admin_token=; path=/; max-age=0; samesite=lax'
                } else {
                  window.localStorage.removeItem('access_token')
                  window.localStorage.removeItem('refresh_token')
                  window.localStorage.removeItem('user')
                  window.localStorage.removeItem('auth-storage')
                  document.cookie = 'accessToken=; path=/; max-age=0; samesite=strict'
                }
              } catch { }
              const path = window.location.pathname + window.location.search
              const isAdmin = window.location.pathname.startsWith('/admin')
              if (isAdmin && !window.location.pathname.startsWith('/admin/auth')) {
                const params = new URLSearchParams()
                params.set('next', path)
                if (typeof detail === 'string' && detail.length < 200) {
                  params.set('reason', detail)
                }
                window.location.href = `/admin/auth/login?${params.toString()}`
              } else if (!window.location.pathname.startsWith('/auth')) {
                const params = new URLSearchParams()
                params.set('next', path)
                if (typeof detail === 'string' && detail.length < 200) {
                  params.set('reason', detail)
                }
                window.location.href = `/auth/login?${params.toString()}`
              }
            }
          } catch { }
        }
        return Promise.reject(error)
      }
    )
  }

  setAuthToken(token: string) {
    this.inMemoryToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearAuthToken() {
    this.inMemoryToken = null;
    delete this.client.defaults.headers.common['Authorization']
  }

  async get<T>(url: string, config = {}): Promise<T> {
    try {
      const response = await this.client.get<T>(url, config)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async post<T>(url: string, data: any, config = {}): Promise<T> {
    try {
      const response = await this.client.post<T>(url, data, config)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async put<T>(url: string, data: any, config = {}): Promise<T> {
    try {
      const response = await this.client.put<T>(url, data, config)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async delete<T>(url: string, config = {}): Promise<T> {
    try {
      const response = await this.client.delete<T>(url, config)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async patch<T>(url: string, data: any, config = {}): Promise<T> {
    try {
      const response = await this.client.patch<T>(url, data, config)
      return response.data
    } catch (error) {
      throw error
    }
  }
}

export const apiClient = new ApiClient({
  baseURL: API_BASE_URL,
})

export default apiClient
