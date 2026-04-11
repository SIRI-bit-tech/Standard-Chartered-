'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function PendingApprovalPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Image 
              src="/SCIB logo.svg" 
              alt="SCIB Logo" 
              width={64} 
              height={64} 
              className="drop-shadow-lg"
            />
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">SCIB</h1>
          </div>
          <p className="text-gray-600 font-medium">Securing Your Account</p>
        </div>

        <Card className="shadow-2xl border-0 overflow-hidden bg-white/90 backdrop-blur-md">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
          
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">Verification Complete!</CardTitle>
            <CardDescription className="text-gray-500 font-medium text-lg">
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4 pb-8">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">Account Under Review</h4>
                  <p className="text-amber-800 text-sm leading-relaxed mt-1">
                    To maintain the highest security standards, all new registrations are manually reviewed. This process typically takes <strong>24 to 48 hours</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-amber-100 pt-3">
                <Mail className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">What Happens Next?</h4>
                  <p className="text-amber-800 text-sm leading-relaxed mt-1">
                    You will receive an approval email once your account is fully active. You'll then be able to log in and set your secure transfer PIN.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
              >
                Back to Login
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Need help? <a href="mailto:support@standardcharteredibank.com" className="text-green-600 hover:underline font-semibold">Contact Support</a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400 font-medium italic">
            &copy; 2026 SCIB International Banking. Secure Communication.
          </p>
        </div>
      </div>
    </div>
  )
}
