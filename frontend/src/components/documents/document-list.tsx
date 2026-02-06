"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/context/auth-context"

interface Document {
  id: string
  document_type: string
  file_name: string
  file_url: string
  status: "pending" | "verified" | "rejected" | "expired"
  uploaded_at: string
  verified_at?: string
  rejection_reason?: string
}

export function DocumentList() {
  const { user, accessToken } = useAuthContext()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [user, accessToken])

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/list`,
        {
          params: { user_id: user?.id },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (response.data.success) {
        setDocuments(response.data.data.documents)
      }
    } catch (err: any) {
      setError("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents/${documentId}`,
        {
          params: { user_id: user?.id },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    } catch (err: any) {
      alert("Failed to delete document")
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      verified: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
    }
    return statusColors[status as keyof typeof statusColors] || statusColors.pending
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading documents...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No documents uploaded yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <h3 className="font-medium text-gray-900">{doc.file_name}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(doc.status)}`}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                  <span className="text-gray-500">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
                {doc.rejection_reason && (
                  <p className="text-sm text-red-600">
                    Rejection reason: {doc.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button type="button" variant="outline" size="sm">
                    View
                  </Button>
                </a>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
