import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"

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
  sendVerificationEmail: async (user, verificationUrl) => {
    // Implement email sending here - call your email service
    // logger.debug(`Email verification sent to ${user.email}`)
  },
  
  // Password reset
  sendPasswordResetEmail: async (user, resetUrl) => {
    // Implement email sending here - call your email service
    // logger.debug(`Password reset email sent to ${user.email}`)
  },
  
  // JWT configuration
  jwt: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    secret: process.env.JWT_SECRET || "jwt-secret-change-in-production",
  },
  
  // Callbacks for custom logic
  callbacks: {
    onSuccess: async (data) => {
      // Handle successful authentication
    },
    onError: async (error) => {
      // Handle authentication errors
    },
  },
})
