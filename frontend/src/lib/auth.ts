import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { API_BASE_URL } from "@/constants"

function isUserWithEmail(user: unknown): user is { email: string } {
  return !!user && typeof (user as any).email === "string" && (user as any).email.length > 0
}

const AUTH_SECRET = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET
if (!AUTH_SECRET) {
  throw new Error("Missing auth secret: set BETTER_AUTH_SECRET or AUTH_SECRET")
}
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error("Missing JWT secret: set JWT_SECRET")
}

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/auth",
  secret: AUTH_SECRET,

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
    if (!isUserWithEmail(user)) return
    const payload = { email: user.email, verification_url: verificationUrl }
    const endpoints = ["/api/v1/auth/resend-verification", "/api/auth/resend-verification"]
    let lastError: unknown = undefined
    for (const path of endpoints) {
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) return
        lastError = new Error(`HTTP ${res.status}`)
      } catch (e) {
        lastError = e
      }
    }
    const msg =
      `Failed to send verification email to [redacted email] via ${endpoints.join(", ")}: ` +
      (lastError instanceof Error ? lastError.message : String(lastError ?? "unknown error"))
    throw new Error(msg)
  },

  // Password reset
  sendPasswordResetEmail: async (user: unknown, resetUrl: string) => {
    if (!isUserWithEmail(user)) return
    const payload = { email: user.email, reset_url: resetUrl }
    const endpoints = ["/api/v1/auth/request-password-reset", "/api/auth/request-password-reset"]
    let lastError: unknown = undefined
    for (const path of endpoints) {
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) return
        lastError = new Error(`HTTP ${res.status}`)
      } catch (e) {
        lastError = e
      }
    }
    const msg =
      `Failed to send password reset email to [redacted email] via ${endpoints.join(", ")}: ` +
      (lastError instanceof Error ? lastError.message : String(lastError ?? "unknown error"))
    throw new Error(msg)
  },

  // JWT configuration
  jwt: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    secret: JWT_SECRET,
  },
})
