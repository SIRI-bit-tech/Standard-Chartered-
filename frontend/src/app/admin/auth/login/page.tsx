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
      }) as {
        success: boolean
        message: string
        data: {
          admin_id: string
          email: string
          first_name?: string
          last_name?: string
          role: string
        }
        token: {
          access_token: string
          refresh_token: string
        }
      }

      console.log('Login: Full response:', response)
      console.log('Login: response.success:', response.success)

      if (response.success) {
        localStorage.setItem('admin_token', response.token.access_token)
        localStorage.setItem('admin_refresh_token', response.token.refresh_token)
        localStorage.setItem('admin_id', response.data.admin_id)
        const fullName = `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim()
        if (fullName) {
          localStorage.setItem('admin_name', fullName)
        }
        localStorage.setItem('admin_email', response.data.email)
        console.log('Login: Stored admin_id:', response.data.admin_id)
        console.log('Login: Redirecting to dashboard...')
        logger.debug('Admin logged in successfully')
        router.push('/admin/dashboard')
      } else {
        console.log('Login: Failed - response.success is false')
        setError(response.message || 'Login failed. Please check your credentials.')
        setLoading(false)
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
            Admin Code (Required)
          </label>
          <Input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="•••••••"
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for admin authentication
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
