'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { useLoadingStore } from '@/lib/store'

export default function LoginPage() {
  // Login page - updated to use username instead of email
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser, setToken } = useAuthStore()
  const { show, hide } = useLoadingStore()

  const getDeviceInfo = () => {
    try {
      let id = localStorage.getItem('device_id')
      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem('device_id', id)
      }
      const ua = navigator.userAgent || ''
      const platform = (navigator as any).platform || ''
      const name = `${platform || 'Device'} • ${ua.split(' ').slice(0, 2).join(' ')}`
      return { device_id: id, device_name: name }
    } catch {
      return { device_id: undefined, device_name: undefined }
    }
  }

  const handleLogin = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    setLoading(true)
    setError('')
    show()

    try {
      const { device_id, device_name } = getDeviceInfo()
      const response = await apiClient.post<{ success: boolean; data: any; token: any }>(
        '/api/v1/auth/login',
        {
          username,
          password,
          device_id,
          device_name,
        },
        { headers: { 'X-Show-Loader': '1' } }
      )

      // If backend requires 2FA, redirect to verification flow
      if (response?.data?.two_factor_required && response?.data?.session_token) {
        hide()
        setLoading(false)
        const params = new URLSearchParams()
        params.set('session', response.data.session_token)
        params.set('device', device_id || '')
        params.set('name', device_name || '')
        window.location.href = `/auth/verify-2fa?${params.toString()}`
        return
      }

      if (response.success && response.data && response.token) {
        // Check if token exists before using it
        if (response.token.access_token && response.token.refresh_token) {
          // Store tokens in localStorage AND cookie for middleware
          localStorage.setItem('access_token', response.token.access_token)
          localStorage.setItem('refresh_token', response.token.refresh_token)

          // Also set cookie for middleware
          document.cookie = `accessToken=${response.token.access_token}; path=/; max-age=3600; secure; samesite=strict`

          // Map user data from server response with fallbacks
          const userData = {
            id: response.data.user_id || '',
            email: response.data.email || '',
            username: response.data.username || '',
            first_name: response.data.first_name || '',
            last_name: response.data.last_name || '',
            phone: response.data.phone || undefined,
            country: response.data.country || 'United States',
            primary_currency: response.data.primary_currency || 'USD',
            tier: response.data.tier || 'basic',
            profile_picture_url: response.data.profile_picture_url || null,
            email_verified: response.data.email_verified || false,
            phone_verified: response.data.phone_verified || false,
            identity_verified: response.data.identity_verified || false,
            created_at: response.data.created_at || new Date().toISOString(),
            last_login: response.data.last_login || new Date().toISOString()
          }

          localStorage.setItem('user', JSON.stringify(userData))

          // Update auth store
          setUser(userData)
          setToken(response.token.access_token)
        } else {
          // Handle missing token case
          setError('Login successful but no token received. Please try again.')
        }

        setLoading(false)
        hide()

        // Navigate to dashboard after successful login
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      } else {
        setLoading(false)
        hide()
        setError('Login failed. Please try again.')
      }
    } catch (err: any) {
      setLoading(false)
      hide()
      setError('Login failed. Please try again.')
    }
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-border">
      <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
      <p className="text-muted-foreground mb-8">Sign in to your Standard Chartered account</p>

      {error && (
        <div className="mb-6 p-4 bg-error/10 text-error rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400"
            required
          />
        </div>

        <div className="flex items-center justify-between text-sm pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 rounded accent-primary" />
            <span className="text-gray-500">Remember me</span>
          </label>
          <Link href="/auth/forgot-password" className="text-primary hover:underline font-medium">
            Forgot password?
          </Link>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-semibold disabled:opacity-50 shadow-md"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>

      <p className="text-center text-muted-foreground mt-6">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}
