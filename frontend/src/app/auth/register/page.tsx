'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, Eye, EyeOff, Check } from 'lucide-react'
import { CountrySelector } from '@/components/ui/country-selector'
import { apiClient } from '@/lib/api-client'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { useLoadingStore } from '@/lib/store'
import { parseApiError } from '@/utils/error-handler'

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
  const [errorFields, setErrorFields] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasNumber: false,
    hasSymbol: false,
    hasUpper: false,
    hasLower: false,
    isLongEnough: false
  })
  const { show, hide } = useLoadingStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === 'password') {
      const hasNumber = /\d/.test(value)
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)
      const hasUpper = /[A-Z]/.test(value)
      const hasLower = /[a-z]/.test(value)
      const isLongEnough = value.length >= 10

      let score = 0
      if (hasNumber) score += 1
      if (hasSymbol) score += 1
      if (hasUpper) score += 1
      if (hasLower) score += 1
      if (isLongEnough) score += 1

      setPasswordStrength({
        score,
        hasNumber,
        hasSymbol,
        hasUpper,
        hasLower,
        isLongEnough
      })
    }

    // Clear specific field error when user starts typing
    if (errorFields.includes(name)) {
      setErrorFields(prev => prev.filter(f => f !== name))
    }
    // Also clear general error when they fix things
    setError('')
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

    if (passwordStrength.score < 4) {
      setError('Password is too weak. Please include at least 10 characters, numbers, and symbols.')
      setErrorFields(['password'])
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
      const { message, errorFields: fields } = parseApiError(err)
      setError(message)
      setErrorFields(fields)
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
            Redirecting you to verify email in a moment...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-border">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
        <p className="text-muted-foreground font-medium">Join SCIB today</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 text-error rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First name"
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('first_name') ? 'border-error ring-error/20' : 'border-border'}`}
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
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('last_name') ? 'border-error ring-error/20' : 'border-border'}`}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('email') ? 'border-error ring-error/20' : 'border-border'}`}
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
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('username') ? 'border-error ring-error/20' : 'border-border'}`}
              required
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              onChange={(value) => {
                setFormData(prev => ({ ...prev, phone: value || '' }));
                if (errorFields.includes('phone')) setErrorFields(prev => prev.filter(f => f !== 'phone'));
              }}
              placeholder="+1 (555) 123-4567"
              className={`w-full px-3 py-3 border rounded-lg focus-within:ring-2 focus-within:ring-primary transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('phone') ? 'border-error ring-error/20' : 'border-border'}`}
              required
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              type="text"
              name="street_address"
              value={formData.street_address}
              onChange={handleChange}
              placeholder="Street Address"
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('street_address') ? 'border-error ring-error/20' : 'border-border'}`}
              required
            />
          </div>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className="w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400"
            required
          />
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State/Province"
            className="w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400"
            required
          />
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            placeholder="Postal Code"
            className="w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400"
            required
          />
        </div>

        {/* Security */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400 ${errorFields.includes('password') ? 'border-error ring-error/20' : 'border-border'}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Confirm password"
              className="w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-gray-900 bg-white placeholder:text-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-gray-400 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {formData.password && (
          <div className="bg-gray-50 p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Password Strength</span>
              <span className={
                passwordStrength.score <= 2 ? 'text-error' :
                  passwordStrength.score <= 4 ? 'text-yellow-500' :
                    'text-green-500'
              }>
                {passwordStrength.score <= 2 ? 'Weak' :
                  passwordStrength.score <= 4 ? 'Moderate' :
                    'Strong'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-full flex-1 transition-all duration-300 ${s <= passwordStrength.score
                    ? (passwordStrength.score <= 2 ? 'bg-error' : passwordStrength.score <= 4 ? 'bg-yellow-500' : 'bg-green-500')
                    : 'bg-gray-100'
                    }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
              <div className={`flex items-center gap-1.5 text-xs ${passwordStrength.isLongEnough ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.isLongEnough ? <Check size={12} /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                8+ characters
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.hasNumber ? <Check size={12} /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                1+ number
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${passwordStrength.hasSymbol ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.hasSymbol ? <Check size={12} /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                1+ symbol
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${passwordStrength.hasUpper ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.hasUpper ? <Check size={12} /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                Upper case
              </div>
            </div>
          </div>
        )}

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
