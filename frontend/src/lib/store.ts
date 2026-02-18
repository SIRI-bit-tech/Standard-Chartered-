import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AuthStore,
  AccountStore,
  NotificationStore,
  LoadingStore,
} from '@/types'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      setUser: (user) => {
        set({ user, isAuthenticated: !!user })
      },
      setToken: (token) => {
        set({ token })
      },
      logout: () => {
        set({ user: null, isAuthenticated: false, token: null })
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          // Also clear the cookie
          document.cookie = 'accessToken=; path=/; max-age=0; secure; samesite=strict'
        }
      },
      reinitialize: () => {
        return true
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token
      }),
      onRehydrateStorage: () => (state) => {
        return state
      }
    }
  )
)

export const useAccountStore = create<AccountStore>((set) => ({
  accounts: [],
  selectedAccount: null,
  loading: false,
  setAccounts: (accounts) => set({ accounts }),
  setSelectedAccount: (selectedAccount) => set({ selectedAccount }),
  setLoading: (loading) => set({ loading }),
}))

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  setUnreadCount: (count) => set({ unreadCount: count }),
}))

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  activeCount: 0,
  isLoading: false,
  show: () => {
    const next = get().activeCount + 1
    set({ activeCount: next, isLoading: true })
  },
  hide: () => {
    const next = Math.max(0, get().activeCount - 1)
    set({ activeCount: next, isLoading: next > 0 })
  },
  reset: () => set({ activeCount: 0, isLoading: false }),
}))
