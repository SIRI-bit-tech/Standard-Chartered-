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
        if (globalThis.window !== undefined) {
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
  setNotifications: (notifications) => set({ 
    notifications, 
    unreadCount: notifications.filter(n => n.status === 'unread').length 
  }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.status === 'unread' ? state.unreadCount + 1 : state.unreadCount
    })),
  removeNotification: (id) =>
    set((state) => {
      const n = state.notifications.find(notif => notif.id === id)
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: n?.status === 'unread' ? state.unreadCount - 1 : state.unreadCount
      }
    }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  markAsRead: (id) =>
    set((state) => {
      const n = state.notifications.find(notif => notif.id === id)
      if (n?.status !== 'unread') return state
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, status: 'read' as const } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, status: 'read' as const })),
      unreadCount: 0
    })),
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
