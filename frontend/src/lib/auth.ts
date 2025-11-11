import axios from 'axios';
import Cookies from 'js-cookie';

// API base URL - adjust this to match your backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('auth_token');
    }
    return Promise.reject(error);
  }
);

// Authentication types
export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  role: 'user' | 'admin' | 'uploader';
}

export interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  profile_image?: string;
  role: string;
  location?: string;
  created_at?: string;
  last_login?: string;
}

export interface UserSession {
  id: string;
  device_info?: string;
  ip_address?: string;
  location?: string;
  created_at: string;
  last_active: string;
  is_current: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
  session_id: string;
}

// Authentication functions
export const authAPI = {
  // Login
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    const { access_token, session_id } = response.data;
    Cookies.set('auth_token', access_token, { expires: 7 }); // 7 days
    Cookies.set('session_id', session_id, { expires: 7 }); // Store session ID
    return response.data;
  },

  // Register
  register: async (data: RegisterData) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Get active sessions
  getActiveSessions: async (): Promise<UserSession[]> => {
    const response = await apiClient.get('/auth/sessions');
    return response.data;
  },

  // Revoke specific session
  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/auth/sessions/${sessionId}`);
  },

  // Logout from current session
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('auth_token');
      Cookies.remove('session_id');
    }
  },

  // Logout from all devices
  logoutAllDevices: async (): Promise<void> => {
    await apiClient.post('/auth/logout-all');
    Cookies.remove('auth_token');
    Cookies.remove('session_id');
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!Cookies.get('auth_token');
  },

  // Get token
  getToken: (): string | undefined => {
    return Cookies.get('auth_token');
  },

  // Get session ID
  getSessionId: (): string | undefined => {
    return Cookies.get('session_id');
  },

  // Update user profile
  updateProfile: async (profileData: {
    username?: string;
    email?: string;
    phone?: string;
    profile_image?: string;
    location?: string;
  }): Promise<User> => {
    const response = await apiClient.put('/auth/update-profile', profileData);
    return response.data.user;
  },

  // Upload profile image
  uploadProfileImage: async (file: File): Promise<{ profile_image: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/auth/upload-profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
  ,
  // Change password
  changePassword: async (data: { current_password: string; new_password: string; confirm_new_password: string; }): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/change-password', data)
    return response.data
  },

  // Security Settings
  getSecuritySettings: async (): Promise<{ settings: any }> => {
    const response = await apiClient.get('/auth/security-settings')
    return response.data
  },

  updateSecuritySettings: async (settings: {
    two_factor_enabled?: boolean
    session_timeout?: number
    password_policy?: any
    login_attempts_limit?: number
    data_retention_days?: number
    ip_whitelist?: string[]
  }): Promise<{ message: string }> => {
    const response = await apiClient.put('/auth/security-settings', settings)
    return response.data
  },

  // Two-Factor Authentication
  setupTwoFactor: async (): Promise<{ secret: string; qr_code: string; backup_codes: string[] }> => {
    const response = await apiClient.post('/auth/two-factor/setup')
    return response.data
  },

  verifyTwoFactor: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/two-factor/verify', { token })
    return response.data
  },

  disableTwoFactor: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/two-factor/disable', { token })
    return response.data
  },

  // Data Export
  exportUserData: async (options: {
    format?: string
    include_chat_history?: boolean
    include_upload_history?: boolean
    include_profile_data?: boolean
  }): Promise<{ data: any; exported_at: string }> => {
    const response = await apiClient.post('/auth/data-export', options)
    return response.data
  },

  // Audit Logs
  getAuditLogs: async (limit: number = 50, offset: number = 0): Promise<{ logs: any[] }> => {
    const response = await apiClient.get(`/auth/audit-logs?limit=${limit}&offset=${offset}`)
    return response.data
  }
}; 
