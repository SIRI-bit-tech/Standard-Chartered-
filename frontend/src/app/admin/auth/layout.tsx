import React from 'react'

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">SC Bank Admin</h1>
          <p className="text-primary-light">Administration Portal</p>
        </div>
        {children}
      </div>
    </div>
  )
}
