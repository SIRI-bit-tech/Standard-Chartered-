"use client"

import React from "react"

import { useState, useRef } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/context/auth-context"

export interface DocumentUploadProps {
  documentType: string
  onSuccess?: (documentId: string) => void
}

const DOCUMENT_TYPES = {
  id: "Identity Document",
  proof_of_address: "Proof of Address",
  income_statement: "Income Statement",
  tax_return: "Tax Return",
  bank_statement: "Bank Statement",
  employment_letter: "Employment Letter",
}

export function DocumentUpload({ documentType, onSuccess }: DocumentUploadProps) {
  const { user, accessToken } = useAuthContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError("")
    setSuccess(false)

    // Validate file size
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit")
      return
    }

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/png"]
    if (!validTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Please upload PDF or image files only.")
      return
    }

    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    setUploading(true)
    setError("")
    setSuccess(false)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("document_type", documentType)
      formData.append("user_id", user.id)

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            )
            setUploadProgress(progress)
          },
        }
      )

      if (response.data.success) {
        setSuccess(true)
        setFile(null)
        setPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        
        onSuccess?.(response.data.data.id)
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload {DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES] || documentType}</CardTitle>
        <CardDescription>
          Upload a PDF or image file (max 10MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Document uploaded successfully!
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <img src={preview || "/placeholder.svg"} alt="Document preview" className="w-full h-auto" />
            </div>
          </div>
        )}

        {/* File Input */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={uploading}
          />

          {file ? (
            <div className="space-y-2">
              <div className="text-2xl">📄</div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl">📤</div>
              <p className="font-medium text-gray-900">Drop file here or click to browse</p>
              <p className="text-sm text-gray-500">PDF or image (JPG, PNG)</p>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1"
          >
            {uploading ? `Uploading ${uploadProgress}%...` : "Upload Document"}
          </Button>
          {file && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null)
                setPreview(null)
                setError("")
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
              disabled={uploading}
            >
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
