'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, User, Mail, Lock, CreditCard } from 'lucide-react'
import { CountrySelector } from '@/components/ui/country-selector'
import { apiClient } from '@/lib/api-client'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    country: 'United States',
    password: '',
    confirm_password: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  interface AuthResponse {
    success: boolean
    message?: string
    data?: any
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        username: formData.username,
        country: formData.country,
        password: formData.password,
      })

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 2000)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-border">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Account Created Successfully!</h1>
          <p className="text-muted-foreground mb-6 font-medium">
            Redirecting you to login page in a moment...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-border">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
        <p className="text-muted-foreground font-medium">Join Standard Chartered today</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 text-error rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-semibold text-foreground mb-2">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First name"
                className="w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Last Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last name"
                className="w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              required
            />
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-semibold text-foreground mb-2">Username</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              className="w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Country</label>
          <CountrySelector
            value={formData.country}
            onChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
            placeholder="Select your country"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm password"
                className="w-full pl-10 pr-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm p-3 bg-muted/30 rounded-lg">
          <input type="checkbox" className="mt-1" required />
          <span className="text-muted-foreground font-medium">
            I agree to Terms of Service and Privacy Policy
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-semibold disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-muted-foreground mt-6 font-medium">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary hover:underline font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  )
}
