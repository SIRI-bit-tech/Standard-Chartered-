import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { API_BASE_URL, API_ENDPOINTS } from "@/constants"
import { useStytch, useStytchUser, useStytchSession } from "@stytch/nextjs"
import posthog from "posthog-js"

export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  country: string
  tier: "standard" | "priority" | "premium"
  primary_currency: string
  email_verified: boolean
  phone_verified: boolean
  identity_verified: boolean
  is_restricted: boolean
  restricted_until: string | null
  created_at: string
  last_login?: string
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
  street_address?: string
  city?: string
  state?: string
  postal_code?: string
}

export function useAuth() {
  const router = useRouter()
  const stytch = useStytch()
  const { user: stytchUser, isInitialized: userInitialized } = useStytchUser()
  const { session: stytchSession } = useStytchSession()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Sync Stytch user to local state and backend profile
  useEffect(() => {
    const syncUser = async () => {
      if (!userInitialized) return

      if (stytchUser && stytchSession) {
        try {
          // Fetch additional profile data from our backend using Stytch session
          const tokens = stytch.session.getTokens()
          const sessionToken = tokens?.session_token

          if (sessionToken) {
            const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.PROFILE}`, {
              headers: {
                Authorization: `Bearer ${sessionToken}`,
              },
            })
            setUser(response.data.data)
            localStorage.setItem('access_token', sessionToken)

            // Identify user in PostHog
            const userData = response.data.data;
            if (userData?.id) {
              posthog.identify(userData.id, {
                email: userData.email,
                name: `${userData.first_name} ${userData.last_name}`,
                username: userData.username,
                country: userData.country,
                tier: userData.tier
              });
            }
          }
        } catch (error) {
          console.error("Failed to sync Stytch user with backend profile:", error)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    syncUser()
  }, [stytchUser, stytchSession, userInitialized])

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        // We use our backend login which handles Stytch + Local DB Sync
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`, {
          username: email,
          password,
        })

        const { token, data } = response.data

        // If Stytch returned a session token, set it in cookie so SDK picks it up
        if (token.access_token && token.access_token.startsWith('session-')) {
          document.cookie = `stytch_session=${token.access_token}; path=/; max-age=3600; secure; samesite=strict`
          // Force SDK to re-sync
          if (stytch.session) {
            try { await (stytch.session as any).authenticate() } catch (e) { }
          }
        }

        localStorage.setItem("accessToken", token.access_token)
        localStorage.setItem("refreshToken", token.refresh_token)
        setUser(data)

        // Identify user in PostHog
        if (data?.id) {
          posthog.identify(data.id, {
            email: data.email,
            name: `${data.first_name} ${data.last_name}`,
            username: data.username,
            country: data.country,
            tier: data.tier
          });
        }

        router.push("/dashboard")
      } catch (error: any) {
        const message = error.response?.data?.detail || "Login failed. Please try again."
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    },
    [router, stytch]
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
          street_address: data.street_address,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
        })

        const { token } = response.data

        if (token.access_token && token.access_token.startsWith('session-')) {
          document.cookie = `stytch_session=${token.access_token}; path=/; max-age=3600; secure; samesite=strict`
          if (stytch.session) {
            try { await (stytch.session as any).authenticate() } catch (e) { }
          }
        }

        localStorage.setItem("accessToken", token.access_token)
        router.push("/auth/verify-email")
      } catch (error: any) {
        const message = error.response?.data?.detail || "Registration failed. Please try again."
        throw new Error(message)
      } finally {
        setLoading(false)
      }
    },
    [router, stytch]
  )

  const logout = useCallback(async () => {
    try {
      await stytch.session.revoke()
      document.cookie = "stytch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      setUser(null)

      // Reset PostHog identity
      posthog.reset();

      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }, [stytch, router])

  const refreshAccessToken = useCallback(async () => {
    // Stytch manages session refreshing automatically via the SDK
    // But we can manually trigger it if needed
    try {
      await stytch.session.authenticate()
    } catch (e) {
      console.error("Token refresh failed:", e)
    }
  }, [stytch])

  return {
    user,
    loading,
    accessToken: typeof window !== 'undefined' ? stytch.session?.getTokens()?.session_token || null : null,
    refreshToken: null, // Stytch uses rolling sessions
    login,
    register,
    logout,
    refreshAccessToken,
  }
}
