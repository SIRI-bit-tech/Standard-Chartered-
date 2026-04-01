import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { API_BASE_URL } from '@/constants'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
const MAX_BYTES = 18 * 1024 * 1024 // 18 MB

async function getAuthToken(req: Request | NextRequest) {
  const cookiesList = await cookies()
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const headerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null
  
  return (
    headerToken ||
    cookiesList.get('accessToken')?.value ||
    cookiesList.get('admin_token')?.value
  )
}

async function verifyProfile(token: string) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const verifyRes = await fetch(`${API_BASE_URL}/api/v1/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
    return verifyRes.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

function validateFile(file: any) {
  if (!file || !(file instanceof File)) {
    return { valid: false, message: 'file is required' }
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { valid: false, message: `Invalid file type: ${file.type}. Allowed: PNG, JPEG, WebP, GIF, SVG.` }
  }
  if (file.size > MAX_BYTES) {
    return { valid: false, message: 'File too large. Max 18 MB.' }
  }
  return { valid: true }
}

async function performUpload(file: File): Promise<string | null> {
  const hasKey = Boolean(process.env.UPLOADTHING_TOKEN || process.env.UPLOADTHING_SECRET || process.env.UPLOADTHING_API_KEY)
  if (!hasKey) {
    console.error('[Upload] No UploadThing API key found')
    return null
  }

  try {
    // Direct import instead of dynamic import for better Vercel compatibility
    const { UTApi } = await import('uploadthing/server')
    
    const key = process.env.UPLOADTHING_TOKEN || process.env.UPLOADTHING_SECRET || process.env.UPLOADTHING_API_KEY
    const utapi = new UTApi({ token: key })
    
    const result = await utapi.uploadFiles(file)
    
    const first = Array.isArray(result) ? result[0] : result
    const responseData = first?.data || first
    return responseData?.url || null
  } catch (err: any) {
    console.error('[Upload] UploadThing error:', err?.message || err)
    return null
  }
}

export async function POST(req: Request | NextRequest) {
  try {
    const token = await getAuthToken(req)
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const cookiesList = await cookies()
    if (!cookiesList.has('admin_token')) {
      const isVerified = await verifyProfile(token)
      if (!isVerified) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
      }
    }

    const form = await req.formData()
    const file = form.get('file')
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 })
    }

    const url = await performUpload(file as File)
    if (!url) {
      return NextResponse.json({ success: false, message: 'Upload failed or service not configured' }, { status: 501 })
    }

    return NextResponse.json({ success: true, data: { url } })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
