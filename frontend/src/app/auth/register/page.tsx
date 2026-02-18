'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { CountrySelector } from '@/components/ui/country-selector'
import { apiClient } from '@/lib/api-client'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { useLoadingStore } from '@/lib/store'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    country: 'United States',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    password: '',
    confirm_password: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { show, hide } = useLoadingStore()

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
    show()

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      setLoading(false)
      hide()
      return
    }

    try {
      const response = await apiClient.post<AuthResponse>(
        '/api/v1/auth/register',
        {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          username: formData.username,
          country: formData.country,
          phone: formData.phone,
          street_address: formData.street_address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          password: formData.password,
        },
        { headers: { 'X-Show-Loader': '1' } }
      )

      if (response.success) {
        setSuccess(true)
        // Redirect to email verification page with email parameter
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`)
        }, 2000)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      let errorMessage = 'Registration failed. Please try again.'
      
      if (err.response?.data) {
        const data = err.response.data
        if (typeof data === 'string') {
          errorMessage = data
        } else if (data.detail) {
          errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
        } else if (data.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
      hide()
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Information */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First name"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          <div className="relative">
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last name"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          <div className="relative">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <CountrySelector
              value={formData.country}
              onChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              placeholder="Select your country"
              className="w-full"
            />
          </div>
          <div className="relative">
            <PhoneInput
              international
              countryCallingCodeEditable={false}
              defaultCountry="US"
              value={formData.phone}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value || '' }))}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              type="text"
              name="street_address"
              value={formData.street_address}
              onChange={handleChange}
              placeholder="Street Address"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            required
          />
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State/Province"
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            required
          />
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            placeholder="Postal Code"
            className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            required
          />
        </div>

        {/* Security */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          <div className="relative">
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Confirm password"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2 py-2">
          <input 
            type="checkbox" 
            id="terms"
            required 
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground">
            I agree to the <Link href="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/legal/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
          </label>
        </div>

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
