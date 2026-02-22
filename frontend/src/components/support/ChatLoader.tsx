'use client'

import dynamic from 'next/dynamic'

const ChatWidget = dynamic(() => import('./ChatWidget').then(mod => mod.ChatWidget), {
    ssr: false,
})

export function ChatLoader() {
    return <ChatWidget />
}
