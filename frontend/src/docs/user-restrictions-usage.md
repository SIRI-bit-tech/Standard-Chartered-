# User Restrictions System - Frontend Implementation

## Overview

This document explains how to use the user restrictions system in the frontend. The system provides two types of restrictions:

1. **Post No Debit (PND)** - Blocks outgoing transactions (transfers, payments, withdrawals)
2. **Online Banking** - Blocks access to online banking

## Components

### 1. UserRestrictionsProvider

Wrap your app with this provider to enable restriction checking:

```tsx
import { UserRestrictionsProvider } from '@/contexts/user-restrictions-context'

<UserRestrictionsProvider userId={user?.id}>
  <App />
</UserRestrictionsProvider>
```

### 2. useRestrictionCheck Hook

The main hook for checking restrictions:

```tsx
import { useRestrictionCheck } from '@/hooks/use-restriction-check'

function TransferForm() {
  const { checkPostNoDebit, hasPostNoDebit } = useRestrictionCheck()

  const handleSubmit = () => {
    // Check PND restriction before allowing transfer
    if (checkPostNoDebit()) {
      return // Modal will be shown automatically
    }
    
    // Proceed with transfer
    submitTransfer()
  }

  return (
    <button onClick={handleSubmit}>
      {hasPostNoDebit ? 'Account Restricted' : 'Send Transfer'}
    </button>
  )
}
```

### 3. RestrictionGuard Component

For declarative restriction checking:

```tsx
import { RestrictionGuard } from '@/components/user/restriction-guard'

<RestrictionGuard 
  restrictionType="post_no_debit" 
  userId={user?.id}
  fallback={<div>Your account is restricted</div>}
>
  <TransferForm />
</RestrictionGuard>
```

## Integration Examples

### Transfer Form Integration

```tsx
// In your transfer component
import { useRestrictionCheck } from '@/hooks/use-restriction-check'

export function TransferPage() {
  const { checkPostNoDebit } = useRestrictionCheck()

  const handleReviewTransfer = () => {
    // Check for PND restriction first
    if (checkPostNoDebit()) {
      return // Modal will be shown by the hook
    }

    // Proceed with transfer review
    showPinModal()
  }

  return (
    <Button onClick={handleReviewTransfer}>
      Review Transfer
    </Button>
  )
}
```

### Payment Form Integration

```tsx
// In your payment component
import { useRestrictionCheck } from '@/hooks/use-restriction-check'

export function PaymentForm() {
  const { checkPostNoDebit } = useRestrictionCheck()

  const handlePayment = () => {
    if (checkPostNoDebit()) {
      return // Blocked by PND restriction
    }

    processPayment()
  }

  return (
    <form onSubmit={handlePayment}>
      {/* Payment fields */}
    </form>
  )
}
```

### Withdrawal Integration

```tsx
// In your withdrawal component
import { useRestrictionCheck } from '@/hooks/use-restriction-check'

export function WithdrawalForm() {
  const { checkPostNoDebit } = useRestrictionCheck()

  const handleWithdrawal = () => {
    if (checkPostNoDebit()) {
      return // Blocked by PND restriction
    }

    processWithdrawal()
  }

  return (
    <Button onClick={handleWithdrawal}>
      Withdraw Funds
    </Button>
  )
}
```

### Login Restriction

```tsx
// In your dashboard layout or auth component
import { LoginRestrictionGuard } from '@/components/auth/login-restriction-guard'

export function DashboardLayout({ children, user }) {
  return (
    <div>
      <LoginRestrictionGuard 
        userId={user?.id}
        onRestricted={() => console.log('User has online banking restriction')}
      />
      {children}
    </div>
  )
}
```

## Available Methods

### useRestrictionCheck Hook

```tsx
const {
  // State
  hasPostNoDebit,              // boolean - true if user has PND restriction
  hasOnlineBankingRestriction, // boolean - true if user has online banking restriction
  postNoDebitRestriction,      // UserRestriction | null - PND restriction details
  onlineBankingRestriction,    // UserRestriction | null - Online banking restriction details

  // Methods
  checkRestriction,             // (type: RestrictionType) => boolean
  getActiveRestriction,        // (type: RestrictionType) => UserRestriction | null
  showRestrictionModal,         // (type: RestrictionType) => void

  // Convenience methods
  checkAndShowModal,           // (type: RestrictionType) => boolean
  checkPostNoDebit,            // () => boolean - checks and shows PND modal
  checkOnlineBanking,          // () => boolean - checks and shows online banking modal
} = useRestrictionCheck()
```

## User Experience

### PND Restriction Modal

When a user with PND restriction tries to make a transfer/payment/withdrawal:

1. **Modal appears** with custom admin message
2. **Shows what's restricted** and why
3. **Lists what they can still do** (view balance, receive deposits, etc.)
4. **User can close modal** but action is blocked

### Online Banking Restriction Modal

When a user with online banking restriction tries to access the dashboard:

1. **Modal appears** with custom admin message
2. **Explains the restriction**
3. **Auto-redirects to login page** after 3 seconds
4. **User can close modal** to go to login immediately

## Styling

The restriction modal uses the existing UI components:

- `Dialog` from `@/components/ui/dialog`
- `Alert` from `@/components/ui/alert`
- `Button` from `@/components/ui/button`
- Icons from `lucide-react`

## Testing

To test the restriction system:

1. **Apply restrictions** using the admin panel
2. **Try restricted actions** as a user
3. **Verify modal appears** with correct message
4. **Check that actions are blocked**
5. **Verify allowed actions still work**

## API Integration

The system automatically fetches user restrictions from:

```
GET /admin/users/{userId}/restrictions
```

The response format:

```json
{
  "restrictions": [
    {
      "id": "restriction-id",
      "restriction_type": "post_no_debit",
      "is_active": true,
      "message": "Custom admin message",
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": "admin-id"
    }
  ]
}
```
