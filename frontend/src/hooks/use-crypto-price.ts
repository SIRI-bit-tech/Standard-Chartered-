import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export function useCryptoPrice(symbol: string = 'bitcoin') {
    const [price, setPrice] = useState<number>(65000) // Default fallback
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await apiClient.get<any>(`/api/v1/accounts/crypto-price?symbol=${symbol}`)
                if (res.price) {
                    setPrice(res.price)
                }
            } catch (e) {
                console.error('Failed to fetch crypto price:', e)
            } finally {
                setLoading(false)
            }
        }

        fetchPrice()
        const interval = setInterval(fetchPrice, 60000) // Refresh every minute
        return () => clearInterval(interval)
    }, [symbol])

    return { price, loading }
}
