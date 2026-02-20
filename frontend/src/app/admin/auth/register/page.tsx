'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'

export default function AdminRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    admin_code: '',
    department: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    setPasswordStrength(strength)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'password') {
      checkPasswordStrength(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      // Validation
      if (formData.password !== formData.confirm_password) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      if (passwordStrength < 2) {
        setError('Password is too weak')
        setLoading(false)
        return
      }

      const response = await apiClient.post<{ success: boolean; message?: string }>(
        '/admin/auth/register',
        {
        email: formData.email,
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        admin_code: formData.admin_code,
        department: formData.department || null
        }
      )

      if (response.success) {
        setSuccess(true)
        logger.debug('Admin registered successfully')
        setTimeout(() => {
          router.push('/admin/auth/login')
        }, 2000)
      }
    } catch (err: any) {
      logger.error('Admin registration error', { error: err })
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8 bg-white shadow-2xl max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex gap-3 p-4 bg-error-light rounded-lg">
            <AlertCircle className="text-error flex-shrink-0" size={20} />
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex gap-3 p-4 bg-success-light rounded-lg">
            <CheckCircle className="text-success flex-shrink-0" size={20} />
            <p className="text-success text-sm">Registration successful! Redirecting to login...</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              First Name
            </label>
            <Input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Last Name
            </label>
            <Input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Email Address
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="admin@standardchartered.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Username
          </label>
          <Input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="johndoe"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Department
          </label>
          <Input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            placeholder="Compliance (Optional)"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {formData.password && (
            <div className="mt-2 flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i < passwordStrength ? 'bg-success' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Confirm Password
          </label>
          <Input
            type="password"
            name="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Admin Registration Code
          </label>
          <Input
            type="password"
            name="admin_code"
            value={formData.admin_code}
            onChange={handleChange}
            placeholder="••••••••"
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Contact your system administrator for the registration code
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
              Creating Account...
            </>
          ) : (
            'Register as Admin'
          )}
        </Button>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <a
              href="/admin/auth/login"
              className="text-primary hover:text-primary-dark font-medium"
            >
              Sign in here
            </a>
          </p>
        </div>
      </form>
    </Card>
  )
}
