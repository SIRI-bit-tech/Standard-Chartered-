"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function EmailVerification() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState(searchParams.get("token") || "")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [email, setEmail] = useState<string>("")

  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem("pendingEmailVerification") || ""
        setEmail(stored)
      } catch {
        setEmail("")
      }
    }
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!token) {
        throw new Error("Verification token is required")
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/verify-email`,
        { token }
      )

      if (response.data.success) {
        setSuccess(true)
        localStorage.removeItem("pendingEmailVerification")
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setResendLoading(true)
    try {
      // Call resend email endpoint
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/resend-verification`,
        { email }
      )
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError("Failed to resend email. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-5xl">✓</div>
            <h2 className="text-2xl font-bold text-green-600">Verified!</h2>
            <p className="text-gray-600">
              Your email has been verified successfully. Redirecting to dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold">Verify Email</CardTitle>
        <CardDescription>
          Enter the verification code sent to {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="token" className="text-sm font-medium">
              Verification Token
            </label>
            <Input
              id="token"
              placeholder="Enter verification token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !token}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resendLoading}
              className="text-sm text-blue-600 hover:underline"
            >
              {resendLoading ? "Resending..." : "Didn't receive email? Resend"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
