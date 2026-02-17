'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { ProfileHeader } from '@/components/profile/profile-header'
import { PersonalInfoForm, type PersonalInfo } from '@/components/profile/personal-info-form'
import { SecurityPanel } from '@/components/profile/security-panel'
import { ActivityList } from '@/components/profile/activity-list'
import { DevicesPanel } from '@/components/profile/devices-panel'
import { useUserRealtime } from '@/hooks/use-user-realtime'
import { ProfileAvatarUploader } from '@/components/profile/profile-avatar-uploader'
import { formatDate } from '@/lib/utils'

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
  const [documents, setDocuments] = useState<any[]>([])
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

      // Load documents
      const documentsResponse = await apiClient.get<{ success: boolean; data: any[] }>(`/api/v1/profile/documents`)
      if (documentsResponse.success) {
        setDocuments(documentsResponse.data)
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
        // Refresh history and security related widgets
        loadProfileData()
      }
    } catch { /* no-op */ }
  })

  if (!user) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
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

      {/* Tabs */}
      <div className="bg-white border-b border-border rounded-t-xl">
        <div className="flex gap-8 px-6 py-4 flex-wrap">
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-2 font-medium transition ${
              activeTab === 'personal'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 font-medium transition ${
              activeTab === 'security'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 font-medium transition ${
              activeTab === 'documents'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 font-medium transition ${
              activeTab === 'activity'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Activity
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading profile...</div>
      ) : (
        <>
          {/* Personal Info Tab */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-xl p-8 border border-border">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Personal Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border rounded-lg hover:bg-muted transition"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          loadProfileData()
                        }}
                        className="px-4 py-2 border rounded-lg hover:bg-muted transition"
                      >
                        Cancel
                      </button>
                      {/* Save button remains inside the form */}
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

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl p-8 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Security Settings</h2>

              <SecurityPanel onRefreshDevices={loadProfileData} />
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl p-8 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Documents</h2>

              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{doc.filename}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(doc.created_at)}</p>
                      </div>
                      <button className="px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition text-sm">
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No documents uploaded yet</p>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-xl p-8 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Login Activity</h2>
              <ActivityList items={loginHistory} />
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Devices</h3>
                <DevicesPanel items={loginHistory} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
