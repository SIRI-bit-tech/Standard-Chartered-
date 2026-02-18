import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 })
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
        const result = await utapi.uploadFiles(file as any, { acl: 'public-read' } as any)
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
