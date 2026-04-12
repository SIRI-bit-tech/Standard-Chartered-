 'use client'
 
 import { useEffect, useState } from 'react'
 import { apiClient } from '@/lib/api-client'
 import { logger } from '@/lib/logger'
import { AdminTransactionsTable } from '@/components/admin/admin-transactions-table'
 import { Input } from '@/components/ui/input'
 import { Button } from '@/components/ui/button'
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select'
import { colors } from '@/types'
import { useAdminRealtime } from '@/hooks/use-admin-realtime'
import { ChevronLeft, ChevronRight } from 'lucide-react'
 
import type { AdminTransactionRow } from '@/types'
 
 export default function AdminTransactionsPage() {
   const [items, setItems] = useState<AdminTransactionRow[]>([])
   const [pagination, setPagination] = useState({
     page: 1,
     pageSize: 10,
     total: 0,
     totalPages: 0,
     hasNext: false,
     hasPrev: false,
   })
   const [filters, setFilters] = useState({
     q: '',
     status: 'all' as const,
   })
 
  async function fetchTx() {
    try {
      const adminId = localStorage.getItem('admin_id')
      if (!adminId) {
        window.location.href = '/admin/auth/login'
        return
      }
      const qs = new URLSearchParams({
        admin_id: adminId,
        q: filters.q,
        status: filters.status,
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
      })
      const res = await apiClient.get<{ 
        success: boolean; 
        data: { 
          items: AdminTransactionRow[];
          total: number;
          page: number;
          page_size: number;
          total_pages: number;
          has_next: boolean;
          has_prev: boolean;
        } 
      }>(
        `/admin/transactions/list?${qs.toString()}`,
      )
      if (res.success) {
        setItems(res.data.items)
        setPagination(prev => ({
          ...prev,
          total: res.data.total,
          totalPages: res.data.total_pages,
          hasNext: res.data.has_next,
          hasPrev: res.data.has_prev,
        }))
      }
    } catch (err: any) {
      logger.error('Failed to fetch transactions list', { error: err })
    }
  }
  
  useEffect(() => {
    const t = setTimeout(fetchTx, 250)
    return () => clearTimeout(t)
  }, [filters.q, filters.status, pagination.page, pagination.pageSize])
  
  useAdminRealtime('admin:transactions', () => {
    fetchTx()
  })
  
  const handleNextPage = () => {
    if (pagination.hasNext) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }))
    }
  }
  
  const handlePrevPage = () => {
    if (pagination.hasPrev) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }))
    }
  }
 
   return (
     <div className="space-y-5">
       <div>
         <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
           Transactions
         </h1>
         <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
           Monitor all transactions including generated transaction history.
         </p>
       </div>
 
       <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
         <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
           <div className="relative flex-1">
             <Input
               placeholder="Search by description or account..."
               value={filters.q}
               onChange={(e) => setFilters({ ...filters, q: e.target.value })}
             />
           </div>
           <div className="flex flex-wrap gap-2">
             <Select value={filters.status} onValueChange={(v: any) => setFilters({ ...filters, status: v })}>
               <SelectTrigger className="w-[140px]">
                 <SelectValue placeholder="Status: All" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Status: All</SelectItem>
                 <SelectItem value="pending">Pending</SelectItem>
                 <SelectItem value="processing">Processing</SelectItem>
                 <SelectItem value="completed">Completed</SelectItem>
                 <SelectItem value="failed">Failed</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
       </div>
 
       <AdminTransactionsTable items={items} />
       
       {/* Pagination Controls */}
       <div className="flex items-center justify-between rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
         <div className="text-sm" style={{ color: colors.textSecondary }}>
           Showing {items.length > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} transactions
         </div>
         <div className="flex items-center gap-2">
           <Button
             variant="outline"
             size="sm"
             onClick={handlePrevPage}
             disabled={!pagination.hasPrev}
             className="gap-1"
           >
             <ChevronLeft className="h-4 w-4" />
             Previous
           </Button>
           <div className="text-sm font-medium px-3" style={{ color: colors.textPrimary }}>
             Page {pagination.page} of {pagination.totalPages || 1}
           </div>
           <Button
             variant="outline"
             size="sm"
             onClick={handleNextPage}
             disabled={!pagination.hasNext}
             className="gap-1"
           >
             Next
             <ChevronRight className="h-4 w-4" />
           </Button>
         </div>
       </div>
     </div>
   )
 }
