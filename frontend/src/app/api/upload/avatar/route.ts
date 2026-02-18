import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { API_BASE_URL } from '@/constants'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: Request | NextRequest) {
  try {
    const token = (await cookies()).get('accessToken')?.value
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    try {
      const verifyRes = await fetch(`${API_BASE_URL}/api/v1/profile`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        // No caching; must validate token freshness
        cache: 'no-store',
      })
      if (!verifyRes.ok) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, message: 'Invalid file type. Only PNG or JPEG allowed.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: 'File too large. Max 5 MB.' }, { status: 400 })
    }

    const hasKey = Boolean(process.env.UPLOADTHING_TOKEN || process.env.UPLOADTHING_SECRET || process.env.UPLOADTHING_API_KEY)
    let url: string | null = null

    if (hasKey) {
      try {
        const modulePath = process.env.UPLOADTHING_MODULE || 'uploadthing/server'
        const mod = await (new Function('p', 'return import(p)'))(modulePath).catch(() => null as any)
        if (!mod || !('UTApi' in mod)) {
          return NextResponse.json(
            { success: false, message: 'UploadThing package not installed' },
            { status: 501 },
          )
        }
        const UTApi = (mod as any).UTApi
        const key =
          process.env.UPLOADTHING_TOKEN ||
          process.env.UPLOADTHING_SECRET ||
          process.env.UPLOADTHING_API_KEY
        const utapi = new UTApi({ apiKey: key })
        const result = await utapi.uploadFiles(file, { acl: 'public-read' } as any)
        // result may be single or array depending on version
        const first = Array.isArray(result) ? result[0] : result
        // Prefer UploadThing v8+ field; fall back for older versions
        url = first?.data?.ufsUrl || first?.ufsUrl || first?.data?.url || first?.url || null
      } catch (e: any) {
        return NextResponse.json(
          { success: false, message: e?.message || 'Upload failed' },
          { status: 500 },
        )
      }
    }

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'UploadThing not configured' },
        { status: 501 },
      )
    }

    return NextResponse.json({ success: true, data: { url } })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
