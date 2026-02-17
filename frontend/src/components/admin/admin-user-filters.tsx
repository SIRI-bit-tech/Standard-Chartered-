 'use client'
 
 import { Input } from '@/components/ui/input'
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select'
 import { Button } from '@/components/ui/button'
 import { SlidersHorizontal } from 'lucide-react'
 import { colors } from '@/types'
 import type { AdminUserDirectoryFilters } from './admin-user-directory'
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
 
 interface AdminUserFiltersProps {
   countries: string[]
   filters: AdminUserDirectoryFilters
   onChange: (next: AdminUserDirectoryFilters) => void
 }
 
 export function AdminUserFilters({ countries, filters, onChange }: AdminUserFiltersProps) {
   return (
     <div className="rounded-xl border bg-white p-4" style={{ borderColor: colors.border }}>
       <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
         <div className="relative flex-1">
           <Input
             placeholder="Search by name, email or ID..."
             value={filters.q}
             onChange={(e) => onChange({ ...filters, q: e.target.value })}
           />
         </div>
         <div className="flex flex-wrap gap-2">
           <Select
             value={filters.status}
             onValueChange={(v: any) => onChange({ ...filters, status: v })}
           >
             <SelectTrigger className="w-[140px]">
               <SelectValue placeholder="Status: All" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Status: All</SelectItem>
               <SelectItem value="active">Active</SelectItem>
               <SelectItem value="suspended">Suspended</SelectItem>
               <SelectItem value="inactive">Inactive</SelectItem>
             </SelectContent>
           </Select>
           <Select
             value={filters.verification}
             onValueChange={(v: any) => onChange({ ...filters, verification: v })}
           >
             <SelectTrigger className="w-[150px]">
               <SelectValue placeholder="Verification: All" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Verification: All</SelectItem>
               <SelectItem value="verified">Verified</SelectItem>
               <SelectItem value="pending">Pending</SelectItem>
               <SelectItem value="needs_review">Needs Review</SelectItem>
             </SelectContent>
           </Select>
           <Select
             value={filters.country}
             onValueChange={(v: any) => onChange({ ...filters, country: v })}
           >
             <SelectTrigger className="w-[140px]">
               <SelectValue placeholder="Country: All" />
             </SelectTrigger>
             <SelectContent>
               {countries.map((c) => (
                 <SelectItem key={c} value={c}>
                   {c === 'all' ? 'Country: All' : c}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
          <DropdownMenu>
             <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More filters" suppressHydrationWarning>
                 <SlidersHorizontal className="h-4 w-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={() => onChange({ q: '', status: 'all', verification: 'all', country: 'all' })}>
                 Reset Filters
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => onChange({ ...filters, verification: 'verified' })}>
                 Show Verified
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => onChange({ ...filters, status: 'active' })}>
                 Show Active
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => onChange({ ...filters, country: 'all' })}>
                 Country: All
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </div>
     </div>
   )
 }
