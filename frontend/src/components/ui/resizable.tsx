'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'

import { cn } from '@/lib/utils'

const OrientationContext = React.createContext<'horizontal' | 'vertical'>('horizontal')

type GroupOrientation = 'horizontal' | 'vertical'
type ResizablePanelGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: GroupOrientation
  direction?: GroupOrientation
  children?: React.ReactNode
}

function ResizablePanelGroup({
  className,
  orientation,
  direction,
  ...props
}: ResizablePanelGroupProps) {
  const dir: GroupOrientation = (orientation ?? (direction as GroupOrientation)) ?? 'horizontal'
  return (
    <OrientationContext.Provider value={dir}>
      <PanelGroup
        data-slot="resizable-panel-group"
        {...({ direction: dir } as any)}
        className={cn('flex h-full w-full', dir === 'vertical' && 'flex-col', className)}
        {...props}
      />
    </OrientationContext.Provider>
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  orientation: orientationProp,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean
  orientation?: 'horizontal' | 'vertical'
}) {
  const ctxOrientation = React.useContext(OrientationContext)
  const orientation = orientationProp ?? ctxOrientation
  return (
    <PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        'bg-border focus-visible:ring-ring relative flex items-center justify-center after:absolute focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden',
        orientation === 'vertical'
          ? 'h-px w-full after:inset-x-0 after:top-1/2 after:h-1 after:w-full after:-translate-y-1/2 [&>div]:rotate-90'
          : 'w-px after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
