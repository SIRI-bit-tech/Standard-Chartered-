'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { getInitials, formatDate } from '@/lib/utils'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal')
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
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
      const profileResponse = await apiClient.get(`/api/v1/profile?user_id=${user.id}`)
      if (profileResponse.success) {
        setProfileData({
          first_name: profileResponse.data.first_name,
          last_name: profileResponse.data.last_name,
          phone: profileResponse.data.phone,
          bio: profileResponse.data.bio || '',
        })
      }

      // Load login history
      const historyResponse = await apiClient.get(
        `/api/v1/profile/login-history?user_id=${user.id}&limit=10`
      )
      if (historyResponse.success) {
        setLoginHistory(historyResponse.data)
      }

      // Load documents
      const documentsResponse = await apiClient.get(`/api/v1/profile/documents?user_id=${user.id}`)
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
      const response = await apiClient.put(`/api/v1/profile`, {
        user_id: user.id,
        ...profileData,
      })

      if (response.success) {
        alert('Profile updated successfully!')
        setUser({ ...user, ...profileData })
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl p-8 border border-border">
                <h2 className="text-2xl font-bold text-foreground mb-6">Personal Information</h2>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, first_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, last_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-2 border border-border rounded-lg bg-border-light"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell us about yourself (optional)"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                      rows={4}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-medium disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
              </div>

              {/* Avatar Card */}
              <div className="bg-white rounded-xl p-8 border border-border h-fit">
                <div className="text-center">
                  <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                    {getInitials(user.first_name, user.last_name)}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {user.first_name} {user.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-success font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tier:</span>
                      <span className="text-primary font-medium capitalize">{user.tier}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl p-8 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Security Settings</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Change Password</h3>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                      Update Password
                    </button>
                  </form>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="font-semibold text-foreground mb-3">Two-Factor Authentication</h3>
                  <p className="text-muted-foreground mb-4">Add an extra layer of security to your account</p>
                  <button className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition">
                    Enable 2FA
                  </button>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="font-semibold text-foreground mb-3">Authorized Devices</h3>
                  <p className="text-muted-foreground mb-4">Manage devices that have access to your account</p>
                  <button className="px-4 py-2 border border-border rounded-lg hover:bg-border transition">
                    View Devices
                  </button>
                </div>
              </div>
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

              {loginHistory.length > 0 ? (
                <div className="space-y-3">
                  {loginHistory.map((activity, idx) => (
                    <div key={idx} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {activity.device_type ? activity.device_type.charAt(0).toUpperCase() + activity.device_type.slice(1) : 'Unknown'} Login
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.city && activity.country
                              ? `${activity.city}, ${activity.country}`
                              : 'Unknown Location'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(activity.created_at)}</p>
                        </div>
                        <span className="text-success text-sm">✓ Successful</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No login activity</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
