 'use client'
 
 import { useEffect, useState } from 'react'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
 import { colors } from '@/types'
 import { Badge } from '@/components/ui/badge'
 
 interface SystemSettings {
   frontend_url: string
   environment: string
   debug: boolean
   real_time_enabled: boolean
   email_configured: boolean
   cloudinary_configured: boolean
 }
 
 export default function AdminSettingsPage() {
   const [settings, setSettings] = useState<SystemSettings | null>(null)
 
   useEffect(() => {
     const fetchSettings = async () => {
       try {
         const adminId = localStorage.getItem('admin_id')
         if (!adminId) {
           window.location.href = '/admin/auth/login'
           return
         }
         const res = await apiClient.get<{ success: boolean; data: SystemSettings }>(
           `/admin/system/settings?admin_id=${adminId}`,
         )
         if (res.success) setSettings(res.data)
       } catch (err: any) {
         logger.error('Failed to fetch system settings', { error: err })
       }
     }
     fetchSettings()
   }, [])
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
           System Settings
         </h1>
         <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
           Environment and service configuration status.
         </p>
       </div>
 
       {settings && (
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <div className="rounded-xl border bg-white p-5" style={{ borderColor: colors.border }}>
             <p className="text-xs" style={{ color: colors.textSecondary }}>
               Environment
             </p>
             <p className="mt-1 text-lg font-semibold" style={{ color: colors.textPrimary }}>
               {settings.environment}
             </p>
             <p className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
               Frontend URL: {settings.frontend_url}
             </p>
             <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
               Debug: {settings.debug ? 'Enabled' : 'Disabled'}
             </p>
           </div>
 
           <div className="rounded-xl border bg-white p-5" style={{ borderColor: colors.border }}>
             <p className="text-xs" style={{ color: colors.textSecondary }}>
               Services
             </p>
             <div className="mt-2 flex flex-wrap gap-2">
               <Badge variant="outline" className="border-0">
                 Real-time: {settings.real_time_enabled ? 'Enabled' : 'Disabled'}
               </Badge>
               <Badge variant="outline" className="border-0">
                 Email: {settings.email_configured ? 'Configured' : 'Missing'}
               </Badge>
               <Badge variant="outline" className="border-0">
                 Cloudinary: {settings.cloudinary_configured ? 'Configured' : 'Missing'}
               </Badge>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
