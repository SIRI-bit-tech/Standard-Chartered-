import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { API_BASE_URL } from "@/constants"

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-change-in-production",

  // Database configuration - use your own database
  database: {
    type: "postgresql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  // Cookie configuration
  plugins: [nextCookies()],

  // Enable features
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignInAfterSignUp: false,
  },

  // Social providers (optional - configure as needed)
  socialProviders: {
    // Google OAuth
    // facebook: {
    //   clientId: process.env.FACEBOOK_CLIENT_ID!,
    //   clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    // },
  },

  // Advanced options
  trustedOrigins: [
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
  ],

  // Email verification
  sendVerificationEmail: async (user: unknown, verificationUrl: string) => {
    const email = (user as any)?.email as string | undefined
    if (!email) return
    const payload = { email, verification_url: verificationUrl }
    const endpoints = ["/api/v1/auth/resend-verification", "/api/auth/resend-verification"]
    for (const path of endpoints) {
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) return
      } catch { }
    }
  },

  // Password reset
  sendPasswordResetEmail: async (user: unknown, resetUrl: string) => {
    const email = (user as any)?.email as string | undefined
    if (!email) return
    const payload = { email, reset_url: resetUrl }
    const endpoints = ["/api/v1/auth/request-password-reset", "/api/auth/request-password-reset"]
    for (const path of endpoints) {
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) return
      } catch { }
    }
  },

  // JWT configuration
  jwt: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    secret: process.env.JWT_SECRET || "jwt-secret-change-in-production",
  },

  // Callbacks for custom logic
  callbacks: {
    onSuccess: async (data: unknown) => {
      const event = (data as any)?.event || "auth_success"
      const userEmail = (data as any)?.user?.email
      try {
        await fetch(`${API_BASE_URL}/api/v1/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Authentication",
            message: userEmail ? `Successful ${event} for ${userEmail}` : `Successful ${event}`,
            type: "info",
          }),
        })
      } catch { }
    },
    onError: async (error: unknown) => {
      const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : "Authentication error"
      try {
        await fetch(`${API_BASE_URL}/api/v1/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Authentication Error",
            message,
            type: "error",
          }),
        })
      } catch { }
    },
  },
})
