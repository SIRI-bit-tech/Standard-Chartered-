import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { colors } from '@/types'

export type HistoryFilterState = {
  q: string
  period: '30' | '90' | 'all'
  type: 'all' | 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'fee' | 'interest' | 'credit' | 'debit'
  status: 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed'
}

export function HistoryFilters({
  value,
  onChange,
}: {
  value: HistoryFilterState
  onChange: (v: HistoryFilterState) => void
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.white }}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <Input
            placeholder="Search beneficiary or reference"
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
          />
        </div>
        <Select value={value.period} onValueChange={(v: any) => onChange({ ...value, period: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Last 30 Days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Select value={value.type} onValueChange={(v: any) => onChange({ ...value, type: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="fee">Fee</SelectItem>
            <SelectItem value="interest">Interest</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="debit">Debit</SelectItem>
          </SelectContent>
        </Select>
        <Select value={value.status} onValueChange={(v: any) => onChange({ ...value, status: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
