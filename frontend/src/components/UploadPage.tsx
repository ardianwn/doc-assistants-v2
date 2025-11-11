'use client'

import { Loading } from '@/components/ui'
import { authAPI } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { CheckCircle, FileText, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'success' | 'error'
  timestamp: Date
  chunks?: number
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportedExtensions = ['.pdf', '.docx', '.txt', '.csv', '.json', '.xlsx']

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const formData = new FormData()
    let validFiles = 0

    // Add all files to FormData
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      if (!supportedExtensions.includes(ext)) {
        alert(`File ${file.name} tidak didukung. Format yang didukung: ${supportedExtensions.join(', ')}`)
        continue
      }

      formData.append('files', file)
      validFiles++

      // Add file to UI immediately
      const fileId = Date.now().toString() + i
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        status: 'uploading',
        timestamp: new Date()
      }
      setUploadedFiles(prev => [...prev, newFile])
    }

    if (validFiles === 0) {
      setIsUploading(false)
      return
    }

    try {
      // Get authentication token
      const token = authAPI.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('http://localhost:8000/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Upload response:', data)
        
        // Update all files to success
        setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'success' })))
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'error' })))
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    switch (ext) {
      case '.pdf':
        return '📄'
      case '.docx':
        return '📝'
      case '.txt':
        return '📃'
      case '.csv':
        return '📊'
      case '.json':
        return '⚙️'
      case '.xlsx':
        return '📈'
      default:
        return '📁'
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Upload Area */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#B3E5E8] rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="w-8 h-8 text-[#1A829B]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Upload Documents
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Upload multiple files to be indexed and ready for AI-powered question answering
            </p>
          </div>

          {/* Drag & Drop Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              dragActive 
                ? "border-[#4DA8B8] bg-[#E5F5F6] dark:bg-gray-700" 
                : "border-gray-300 dark:border-gray-600 hover:border-[#4DA8B8] hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Drag and drop your files here
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-[#1A829B] text-white rounded-md hover:bg-[#146B7C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <Loading size="sm" />
                  Uploading...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Choose Files
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.csv,.json,.xlsx"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Supported formats: PDF, DOCX, TXT, CSV, JSON, XLSX
            </p>
          </div>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      file.status === 'success' && "bg-green-100",
                      file.status === 'error' && "bg-red-100",
                      file.status === 'uploading' && "bg-blue-100"
                    )}>
                      {file.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {file.status === 'error' && (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      {file.status === 'uploading' && (
                        <Loading size="sm" className="text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getFileIcon(file.name)}</span>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)} • {file.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      file.status === 'success' && "bg-green-100 text-green-800",
                      file.status === 'error' && "bg-red-100 text-red-800",
                      file.status === 'uploading' && "bg-blue-100 text-blue-800"
                    )}>
                      {file.status === 'success' && 'Success'}
                      {file.status === 'error' && 'Error'}
                      {file.status === 'uploading' && 'Uploading'}
                    </span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
