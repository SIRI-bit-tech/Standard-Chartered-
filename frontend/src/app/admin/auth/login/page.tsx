'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.post('/admin/auth/login', {
        email,
        password,
        admin_code: adminCode || undefined
      })

      if (response.data.success) {
        const { token } = response.data
        localStorage.setItem('admin_token', token.access_token)
        localStorage.setItem('admin_refresh_token', token.refresh_token)
        logger.debug('Admin logged in successfully')
        router.push('/admin/dashboard')
      }
    } catch (err: any) {
      logger.error('Admin login error', { error: err })
      setError(err.response?.data?.message || 'Failed to login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8 bg-white shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex gap-3 p-4 bg-error-light rounded-lg">
            <AlertCircle className="text-error flex-shrink-0" size={20} />
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@standardchartered.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Admin Code (Optional)
          </label>
          <Input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required if 2FA is enabled
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2" size={18} />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Don't have an admin account?{' '}
            <a
              href="/admin/auth/register"
              className="text-primary hover:text-primary-dark font-medium"
            >
              Register here
            </a>
          </p>
        </div>
      </form>
    </Card>
  )
}
