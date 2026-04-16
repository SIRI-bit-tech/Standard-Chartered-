import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { API_BASE_URL, API_ENDPOINTS } from "@/constants"
import { useStytch, useStytchUser, useStytchSession } from "@stytch/nextjs"
import { identifyUser, resetAnalytics } from "@/lib/analytics"
import { apiClient } from "@/lib/api-client"

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
      if (!userInitialized) {
        // If not Stytch, try to fetch profile from local auth cookie/memory
        try {
          const response = await apiClient.get<{ data: User }>(API_ENDPOINTS.PROFILE);
          setUser(response.data);
          setLoading(false);
        } catch {
          setLoading(false);
        }
        return
      }

      if (stytchUser && stytchSession) {
        try {
          const tokens = stytch.session.getTokens()
          const sessionToken = tokens?.session_token

          if (sessionToken) {
            const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.PROFILE}`, {
              headers: {
                Authorization: `Bearer ${sessionToken}`,
              },
            })
            setUser(response.data.data)
            apiClient.setAuthToken(sessionToken);

            identifyUser(response.data.data.id, {
              country: response.data.data.country,
              tier: response.data.data.tier,
            });
          }
        } catch (error) {
          console.error("Failed to sync Stytch user with backend profile:", error)
        }
      } else if (!stytchUser && userInitialized) {
        // Stytch not logged in, but check if local auth works
        try {
          const response = await apiClient.get<{ data: User }>(API_ENDPOINTS.PROFILE);
          setUser(response.data);
        } catch {
          setUser(null);
        }
      }
      setLoading(false)
    }

    syncUser()
  }, [stytchUser, stytchSession, userInitialized])

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const response = await apiClient.post<any>(API_ENDPOINTS.AUTH_LOGIN, {
          username: email,
          password,
        })

        const { token, data } = response

        // Use in-memory token through apiClient
        if (token.access_token) {
          apiClient.setAuthToken(token.access_token);
        }

        // If Stytch returned a session token, set it in cookie so SDK picks it up
        if (token.access_token && token.access_token.startsWith('session-')) {
          document.cookie = `stytch_session=${token.access_token}; path=/; max-age=3600; secure; samesite=strict`
          if (stytch.session) {
            try { await (stytch.session as any).authenticate() } catch (e) { }
          }
        }

        // Fetch fresh profile data to get complete user object (including transfer_pin_set)
        let userData = data
        try {
          const profileRes = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.PROFILE}`, {
            headers: { Authorization: `Bearer ${token.access_token}` }
          })
          userData = profileRes.data.data
        } catch (e) {
          console.warn('Failed to fetch profile, using login data')
        }

        setUser(userData)
        identifyUser(userData.id, {
          country: userData.country,
          tier: userData.tier,
        });

        if (data.redirect_to) {
          if (data.redirect_to === "/auth/set-transfer-pin" && data.verification_token) {
            router.push(`${data.redirect_to}?email=${encodeURIComponent(userData.email)}&token=${encodeURIComponent(data.verification_token)}`)
          } else {
            router.push(data.redirect_to)
          }
        } else {
          router.push("/dashboard")
        }
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
        const response = await apiClient.post<any>(API_ENDPOINTS.AUTH_REGISTER, {
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

        const { token } = response

        if (token.access_token && token.access_token.startsWith('session-')) {
          document.cookie = `stytch_session=${token.access_token}; path=/; max-age=3600; secure; samesite=strict`
          if (stytch.session) {
            try { await (stytch.session as any).authenticate() } catch (e) { }
          }
        }

        if (token.access_token) {
          apiClient.setAuthToken(token.access_token);
        }

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
      if (stytch.session) await stytch.session.revoke()
      document.cookie = "stytch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      apiClient.clearAuthToken()
      setUser(null)
      resetAnalytics();
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }, [stytch, router])

  const refreshAccessToken = useCallback(async () => {
    try {
      await stytch.session.authenticate()
    } catch (e) {
      console.error("Token refresh failed:", e)
    }
  }, [stytch])

  return {
    user,
    loading,
    accessToken: null, // Tokens are now in-memory only via apiClient
    refreshToken: null,
    login,
    register,
    logout,
    refreshAccessToken,
  }
}
