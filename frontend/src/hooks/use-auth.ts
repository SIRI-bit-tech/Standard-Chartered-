"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { API_BASE_URL, API_ENDPOINTS } from "@/constants"

export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  country: string
  tier: "standard" | "priority" | "premium"
  primaryCurrency: string
  isEmailVerified: boolean
  isTwoFaEnabled: boolean
  createdAt: string
  lastLogin?: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  accessToken: string | null
  refreshToken: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<void>
}

export interface RegisterData {
  email: string
  username: string
  firstName: string
  lastName: string
  country: string
  phone?: string
  password: string
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for stored tokens
        const storedAccessToken = localStorage.getItem("accessToken")
        const storedRefreshToken = localStorage.getItem("refreshToken")

        if (storedAccessToken) {
          setAccessToken(storedAccessToken)
          setRefreshToken(storedRefreshToken)

          // Verify token is still valid
          try {
            const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.PROFILE}`, {
              headers: {
                Authorization: `Bearer ${storedAccessToken}`,
              },
            })
            setUser(response.data.data)
          } catch (error) {
            // Token might be expired, try to refresh
            if (storedRefreshToken) {
              await refreshAccessToken()
            } else {
              // Clear invalid tokens
              localStorage.removeItem("accessToken")
              localStorage.removeItem("refreshToken")
            }
          }
        }
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`, {
          email,
          password,
        })

        const { token, data } = response.data

        // Store tokens
        localStorage.setItem("accessToken", token.access_token)
        localStorage.setItem("refreshToken", token.refresh_token)

        setAccessToken(token.access_token)
        setRefreshToken(token.refresh_token)
        setUser(data)

        // Redirect to dashboard
        router.push("/dashboard")
      } catch (error: any) {
        const message =
          error.response?.data?.detail || "Login failed. Please try again."
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const register = useCallback(
    async (data: RegisterData) => {
      setLoading(true)
      try {
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH_REGISTER}`, {
          email: data.email,
          username: data.username,
          first_name: data.firstName,
          last_name: data.lastName,
          country: data.country,
          phone: data.phone,
          password: data.password,
        })

        const { token } = response.data

        // Store tokens
        localStorage.setItem("accessToken", token.access_token)
        localStorage.setItem("refreshToken", token.refresh_token)
        localStorage.setItem("pendingEmailVerification", data.email)

        setAccessToken(token.access_token)
        setRefreshToken(token.refresh_token)

        // Redirect to email verification
        router.push("/auth/verify-email")
      } catch (error: any) {
        const message =
          error.response?.data?.detail || "Registration failed. Please try again."
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const logout = useCallback(async () => {
    try {
      // Call logout endpoint if needed
      if (accessToken) {
        try {
          await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH_LOGOUT}`, {}, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })
        } catch (error) {
          // Continue logout even if API call fails
          console.error("Logout API error:", error)
        }
      }

      // Clear local state and storage
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      setUser(null)
      setAccessToken(null)
      setRefreshToken(null)

      // Redirect to home
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }, [accessToken, router])

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      await logout()
      return
    }

    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH_REFRESH}`, {
        refresh_token: refreshToken,
      })

      const { access_token, refresh_token: newRefreshToken } = response.data

      localStorage.setItem("accessToken", access_token)
      if (newRefreshToken) {
        localStorage.setItem("refreshToken", newRefreshToken)
        setRefreshToken(newRefreshToken)
      }

      setAccessToken(access_token)
    } catch (error) {
      console.error("Token refresh failed:", error)
      await logout()
    }
  }, [refreshToken, logout])

  return {
    user,
    loading,
    accessToken,
    refreshToken,
    login,
    register,
    logout,
    refreshAccessToken,
  }
}
