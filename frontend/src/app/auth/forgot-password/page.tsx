'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { parseApiError } from '@/utils/error-handler'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            await apiClient.post('/api/v1/auth/password-reset', { email })
            setSuccess(true)
        } catch (err: any) {
            const { message } = parseApiError(err)
            setError(message || 'Failed to send reset email. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 shadow-lg shadow-green-200">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Security Center</h1>
                    <p className="text-gray-600 mt-2">Recovery & Authentication Services</p>
                </div>

                <Card className="shadow-2xl border-0 overflow-hidden bg-white/95 backdrop-blur-md">
                    <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl font-bold text-gray-800">
                            {success ? 'Email Sent' : 'Reset Password'}
                        </CardTitle>
                        <CardDescription className="text-gray-500 font-medium">
                            {success
                                ? "If an account exists, you'll receive a link shortly."
                                : "Enter your email to receive a secure reset link."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4 pb-8">
                        {success ? (
                            <div className="space-y-6 text-center animate-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    A password reset link has been dispatched to <strong>{email}</strong>.
                                    Please check your inbox and follow the instructions.
                                </p>
                                <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                                    <Link href="/auth/login">Return to Login</Link>
                                </Button>
                                <div className="text-xs text-gray-400">
                                    Didn't receive it? Check your spam folder or try again in a few minutes.
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 py-3">
                                        <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-green-600" />
                                        <span>Registered Email Address</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="e.g. name@example.com"
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-green-500 focus:bg-white focus:outline-none transition-all shadow-inner text-gray-900"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-6 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : 'Send Reset Link'}
                                </Button>

                                <div className="text-center">
                                    <Link
                                        href="/auth/login"
                                        className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-green-650 transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Back to Sign In
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Secure Footer */}
                <div className="mt-8 text-center text-xs text-gray-400 font-medium tracking-wide uppercase flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    Secure Banking Standard • 256-bit Encryption
                </div>
            </div>
        </div>
    )
}
