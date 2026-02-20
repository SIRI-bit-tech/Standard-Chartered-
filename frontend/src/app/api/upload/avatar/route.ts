import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { API_BASE_URL } from '@/constants'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
const MAX_BYTES = 18 * 1024 * 1024 // 18 MB

export async function POST(req: Request | NextRequest) {
  try {
    const cookiesList = await cookies()
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const headerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null
    const token =
      headerToken ||
      cookiesList.get('accessToken')?.value ||
      cookiesList.get('admin_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const isAdmin = cookiesList.has('admin_token')

    // Only verify profile for regular users
    if (!isAdmin) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        try {
          const verifyRes = await fetch(`${API_BASE_URL}/api/v1/profile`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: controller.signal,
          })
          if (!verifyRes.ok) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
          }
        } finally {
          clearTimeout(timeoutId)
        }
      } catch {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
      }
    }

    const form = await req.formData()
    const file = form.get('file')


    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, message: `Invalid file type: ${file.type}. Allowed: PNG, JPEG, WebP, GIF, SVG.` }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: 'File too large. Max 18 MB.' }, { status: 400 })
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
        const responseData = first?.data || first
        url = responseData?.ufsUrl || responseData?.url || null
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
