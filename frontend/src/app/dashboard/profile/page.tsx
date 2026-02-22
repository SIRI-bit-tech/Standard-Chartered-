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
        `/api/v1/security/login-history?limit=10`
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
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="px-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Profile & Settings</h1>
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
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-border bg-gray-50/50 overflow-x-auto scrollbar-hide">
          <div className="flex px-2 sm:px-6">
            {[
              { id: 'personal', label: 'Personal Info' },
              { id: 'security', label: 'Security' },
              { id: 'activity', label: 'Activity' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-4 sm:px-6 text-sm sm:text-base font-medium transition-all relative whitespace-nowrap ${activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-100/50'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-8 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Personal Information</h2>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2 bg-white border border-border rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-700"
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
                          className="px-6 py-2 border border-border rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-500"
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
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
                  <SecurityPanel />
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-10">
                  <section>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Recent Login Activity</h2>
                    <ActivityList items={loginHistory} />
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Trusted Devices</h2>
                      <button
                        onClick={loadProfileData}
                        className="text-primary text-sm hover:underline font-bold"
                      >
                        Refresh List
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">
                      These devices have access to your account without requiring additional security prompts.
                    </p>
                    <DevicesPanel items={trustedDevices} />
                  </section>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
