import axios, { AxiosInstance, AxiosError } from 'axios'
import { API_BASE_URL } from '@/constants'

interface ApiClientConfig {
  baseURL: string
  timeout?: number
}

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[API Error]', error.message)
        return Promise.reject(error)
      }
    )
  }

  setAuthToken(token: string) {
    this.token = token
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearAuthToken() {
    this.token = null
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
