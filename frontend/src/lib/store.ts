import { create } from 'zustand'
import { User, Account, Notification } from '@/types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
}

interface AccountStore {
  accounts: Account[]
  selectedAccount: Account | null
  loading: boolean
  setAccounts: (accounts: Account[]) => void
  setSelectedAccount: (account: Account | null) => void
  setLoading: (loading: boolean) => void
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
  setUnreadCount: (count: number) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  token: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  logout: () => set({ user: null, isAuthenticated: false, token: null }),
}))

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
