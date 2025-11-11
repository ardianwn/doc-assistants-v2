'use client';

import AdminSidebar from '@/components/AdminSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading } from '@/components/ui';
import { authAPI } from '@/lib/auth';
import {
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Eye,
    FileText,
    Menu,
    RefreshCw,
    Search,
    Trash2,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  vector_count?: number;
  chunk_count?: number;
  page_count?: number;
  processed_at?: string;
}

interface DocumentDetail extends Document {
  error_message?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  embedding_model?: string;
  chunks: Array<{
    id: number;
    chunk_index: number;
    content: string;
    full_content: string;
    token_count: number;
    char_count: number;
    created_at: string;
  }>;
}

export default function DocsManagementPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return authAPI.getToken();
    }
    return null;
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/admin/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      setDocuments(data);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentDetail = async (docId: number) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document detail: ${response.statusText}`);
      }

      const data = await response.json();
      setSelectedDoc(data);
      setShowDetailModal(true);
    } catch (err: any) {
      console.error('Error fetching document detail:', err);
      setError(err.message || 'Failed to fetch document detail');
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      await fetchDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
    }
  };

  const retryProcessing = async (docId: number) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to retry processing: ${response.statusText}`);
      }

      await fetchDocuments();
    } catch (err: any) {
      console.error('Error retrying processing:', err);
      setError(err.message || 'Failed to retry processing');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const formatDate = (dateString: string): string => {
    // Backend mengirim datetime dalam timezone Jakarta (naive datetime)
    // Format: "2025-10-01T08:37:00" tanpa info timezone
    // Browser akan parse ini sebagai local time
    // Kita perlu treat ini sebagai Jakarta time
    
    // Jika string sudah ada timezone info (Z atau +07:00), parse langsung
    if (dateString.includes('Z') || dateString.includes('+')) {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      });
    }
    
    // Jika tidak ada timezone info, tambahkan +07:00 (Jakarta offset)
    const dateWithTz = dateString.includes('T') 
      ? dateString + '+07:00' 
      : dateString;
    const date = new Date(dateWithTz);
    
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ready: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Ready' },
      processing: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Processing' },
      uploaded: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, label: 'Uploaded' },
      error: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Error' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.uploaded;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleChunkExpand = (chunkId: number) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(chunkId)) {
      newExpanded.delete(chunkId);
    } else {
      newExpanded.add(chunkId);
    }
    setExpandedChunks(newExpanded);
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 relative">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onToggle={toggleSidebar}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documents Management</h3>
                  <button 
                    onClick={fetchDocuments}
                    className="bg-[#1A829B] text-white px-4 py-2 rounded-md hover:bg-[#146B7C] transition-colors flex items-center space-x-2"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-[#1A829B]"
                      />
                    </div>
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-[#1A829B]"
                  >
                    <option value="all">All Status</option>
                    <option value="uploaded">Uploaded</option>
                    <option value="processing">Processing</option>
                    <option value="ready">Ready</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>

              {/* Documents Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Document</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chunks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uploaded</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Processed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-[#1A829B] mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.filename}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">By {doc.uploaded_by}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{doc.file_type}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{formatFileSize(doc.file_size)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {doc.chunk_count || 0} chunks
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(doc.uploaded_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {doc.processed_at ? formatDate(doc.processed_at) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => fetchDocumentDetail(doc.id)}
                              className="text-[#1A829B] hover:text-[#0A3D4A]"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {doc.status === 'error' && (
                              <button 
                                onClick={() => retryProcessing(doc.id)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Retry Processing"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredDocuments.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No documents found
                  </div>
                )}
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loading size="md" />
              </div>
            )}

            {/* Document Detail Modal */}
            {showDetailModal && selectedDoc && (
              <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
                <div className="relative top-10 mx-auto p-5 border border-gray-200 dark:border-gray-600 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Document Details
                    </h3>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedDoc(null);
                        setExpandedChunks(new Set());
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Document Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Document Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Filename:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedDoc.filename}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <span className="ml-2">{getStatusBadge(selectedDoc.status)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Size:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{formatFileSize(selectedDoc.file_size)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Type:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedDoc.file_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Pages:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedDoc.page_count || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Chunks:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedDoc.chunk_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{formatDate(selectedDoc.uploaded_at)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Processed:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">
                            {selectedDoc.processed_at ? formatDate(selectedDoc.processed_at) : 'Not yet'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Processing Parameters */}
                    {selectedDoc.embedding_model && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Processing Parameters</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Chunk Size:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedDoc.chunk_size}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Chunk Overlap:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedDoc.chunk_overlap}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500 dark:text-gray-400">Embedding Model:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedDoc.embedding_model}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {selectedDoc.error_message && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-red-900 dark:text-red-400 mb-2">Error Details</h4>
                        <p className="text-sm text-red-800 dark:text-red-300">{selectedDoc.error_message}</p>
                      </div>
                    )}

                    {/* Chunks List */}
                    {selectedDoc.chunks && selectedDoc.chunks.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Chunks ({selectedDoc.chunks.length})</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {selectedDoc.chunks.map((chunk) => (
                            <div key={chunk.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Chunk #{chunk.chunk_index + 1}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {chunk.token_count} tokens | {chunk.char_count} chars
                                  </span>
                                  <button
                                    onClick={() => toggleChunkExpand(chunk.id)}
                                    className="text-[#1A829B] hover:text-[#0A3D4A]"
                                  >
                                    {expandedChunks.has(chunk.id) ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {expandedChunks.has(chunk.id) ? chunk.full_content : chunk.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
