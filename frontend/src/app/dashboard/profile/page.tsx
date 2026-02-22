'use client'

import React, { useEffect, useState } from "react"
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { ProfileHeader } from '@/components/profile/profile-header'
import { PersonalInfoForm, type PersonalInfo } from '@/components/profile/personal-info-form'
import { SecurityPanel } from '@/components/profile/security-panel'
import { ActivityList } from '@/components/profile/activity-list'
import { DevicesPanel } from '@/components/profile/devices-panel'
import { useUserRealtime } from '@/hooks/use-user-realtime'
import { ProfileAvatarUploader } from '@/components/profile/profile-avatar-uploader'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState<PersonalInfo>({
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    email: '',
  })
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [trustedDevices, setTrustedDevices] = useState<any[]>([])
  const { user, setUser } = useAuthStore()

  useEffect(() => {
    loadProfileData()
  }, [user])

  const loadProfileData = async () => {
    if (!user) return

    try {
      // Load profile
      const profileResponse = await apiClient.get<{ success: boolean; data: any }>(`/api/v1/profile`)
      if (profileResponse.success) {
        setProfileData({
          first_name: profileResponse.data.first_name,
          last_name: profileResponse.data.last_name,
          phone: profileResponse.data.phone || '',
          country: profileResponse.data.country || '',
          street_address: profileResponse.data.street_address || '',
          city: profileResponse.data.city || '',
          state: profileResponse.data.state || '',
          postal_code: profileResponse.data.postal_code || '',
          email: user?.email || profileResponse.data.email || '',
        })
        if (user) {
          setUser({
            ...user,
            profile_picture_url: profileResponse.data.profile_picture_url || user.profile_picture_url,
            created_at: profileResponse.data.created_at || user.created_at,
            last_login: profileResponse.data.last_login || user.last_login,
          })
        }
      }

      // Load login history
      const historyResponse = await apiClient.get<{ success: boolean; data: any[] }>(
        `/api/v1/profile/login-history?limit=10`
      )
      if (historyResponse.success) {
        setLoginHistory(historyResponse.data)
      }

      // Load actual trusted devices
      const devicesResponse = await apiClient.get<{ success: boolean; data: any[] }>(`/api/v1/security/devices`)
      if (devicesResponse.success) {
        setTrustedDevices(devicesResponse.data)
      }
    } catch (error) {
      console.error('Failed to load profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const payload = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        country: profileData.country,
        street_address: profileData.street_address,
        city: profileData.city,
        state: profileData.state,
        postal_code: profileData.postal_code,
      }
      const response = await apiClient.put<{ success: boolean; data: any }>(`/api/v1/profile`, payload)

      if (response.success) {
        alert('Profile updated successfully!')
        setUser({ ...user, ...payload })
        await loadProfileData()
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const activityChannel = user?.id ? `banking:notifications:${user.id}` : ''
  useUserRealtime(activityChannel, (payload) => {
    try {
      if (payload?.type === 'login_activity' || payload?.type === 'security_update' || payload?.type === 'profile_update') {
        loadProfileData()
      }
    } catch { /* no-op */ }
  })

  if (!user) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile & Settings</h1>
      <ProfileHeader
        first_name={user.first_name}
        last_name={user.last_name}
        email={user.email}
        created_at={user.created_at}
        profile_picture_url={user.profile_picture_url || undefined}
        rightContent={
          <ProfileAvatarUploader
            onUploaded={(url) => {
              if (user) setUser({ ...user, profile_picture_url: url })
            }}
          />
        }
      />

      <div className="bg-white border-b border-border rounded-t-xl overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 sm:gap-8 px-4 sm:px-6 py-4 whitespace-nowrap min-w-max">
          {[
            { id: 'personal', label: 'Personal Info' },
            { id: 'security', label: 'Security' },
            { id: 'activity', label: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 text-sm sm:text-base font-medium transition ${activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
      ) : (
        <div className="min-h-[400px]">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white rounded-xl p-4 sm:p-8 border border-border shadow-sm">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Personal Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          loadProfileData()
                        }}
                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <PersonalInfoForm
                  value={profileData}
                  disabled={!isEditing || loading}
                  onChange={setProfileData}
                  onSubmit={handleUpdateProfile}
                />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-xl p-4 sm:p-8 border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Security Settings</h2>
              <SecurityPanel onRefreshDevices={loadProfileData} />
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white rounded-xl p-4 sm:p-8 border border-border shadow-sm">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Recent Login Activity</h2>
                <ActivityList items={loginHistory} />
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-8 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-foreground">Trusted Devices</h3>
                  <button
                    onClick={loadProfileData}
                    className="text-primary text-sm hover:underline font-medium"
                  >
                    Refresh
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  These devices have access to your account without requiring additional security prompts.
                </p>
                <DevicesPanel items={trustedDevices} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
