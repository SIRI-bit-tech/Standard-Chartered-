'use client'

import * as React from 'react'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type CheckboxProps = {
  className?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  name?: string
}

function Checkbox({ className, checked, defaultChecked, onCheckedChange, disabled, id, name }: CheckboxProps) {
  const isControlled = typeof checked !== 'undefined'
  const [internal, setInternal] = React.useState<boolean>(!!defaultChecked)
  const value = isControlled ? !!checked : internal

  const toggle = React.useCallback(() => {
    if (disabled) return
    const next = !value
    if (!isControlled) setInternal(next)
    onCheckedChange?.(next)
  }, [value, disabled, isControlled, onCheckedChange])

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={value}
      data-slot="checkbox"
      data-state={value ? 'checked' : 'unchecked'}
      disabled={disabled}
      id={id}
      name={name}
      onClick={toggle}
      className={cn(
        'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center',
        className,
      )}
    >
      {value && <CheckIcon className="size-3.5" />}
    </button>
  )
}

export { Checkbox }
