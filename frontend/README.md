# Frontend Documentation - DocAI

> **Comprehensive and Accurate Frontend Documentation**  
> Last Updated: 2025  
> Framework: Next.js 14 (App Router) + React 18 + TypeScript 5

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Architecture](#project-architecture)
4. [Installation & Setup](#installation--setup)
5. [Running the Application](#running-the-application)
6. [Features](#features)
7. [Routing & Pages](#routing--pages)
8. [Components](#components)
9. [Contexts & State Management](#contexts--state-management)
10. [Services & API Integration](#services--api-integration)
11. [Styling & Theming](#styling--theming)
12. [Authentication Flow](#authentication-flow)
13. [Environment Configuration](#environment-configuration)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**DocAI** is an intelligent document processing and AI chat application built with modern web technologies. The frontend provides a seamless user experience for:

- **AI-powered chat interface** with OpenAI Assistants API integration
- **Document upload** with drag-and-drop support
- **Multi-session management** with conversation history
- **Role-based access control** (User, Admin, Uploader)
- **Dark mode support** with system theme detection
- **Location-based services** for enhanced user experience

### Key Highlights

- ✅ **100% TypeScript** for type safety
- ✅ **Responsive Design** - Works seamlessly on mobile, tablet, and desktop
- ✅ **Server-Side Rendering (SSR)** with Next.js App Router
- ✅ **Real-time Chat** with OpenAI Assistants API
- ✅ **Multi-device Session Management**
- ✅ **Dark/Light Theme** with system preference detection
- ✅ **Protected Routes** with role-based access
- ✅ **Location Permission Handling** with user consent

---

## 🛠️ Tech Stack

### Core Framework
- **Next.js**: 14.0.0 (App Router)
- **React**: ^18
- **TypeScript**: ^5

### Styling & UI
- **Tailwind CSS**: ^3.3.0
- **class-variance-authority**: ^0.7.0
- **clsx**: ^2.0.0
- **tailwind-merge**: ^2.0.0
- **lucide-react**: ^0.294.0 (Icon library)

### State Management & Context
- **React Context API**:
  - `AuthContext` - Authentication state
  - `LocationContext` - Location permission management
  - `ThemeContext` - Dark/light mode

### HTTP Client & Data Fetching
- **axios**: ^1.6.2 (HTTP requests)
- **js-cookie**: ^3.0.5 (Cookie management)

### Form Handling
- **react-hook-form**: ^7.48.2 (Form validation)

### Markdown Rendering
- **react-markdown**: ^9.0.1
- **remark-gfm**: ^4.0.0 (GitHub Flavored Markdown)
- **remark-breaks**: ^4.0.0 (Line breaks support)
- **rehype-raw**: ^7.0.0 (HTML in markdown)
- **rehype-sanitize**: ^6.0.0 (Security)

### Notifications
- **react-hot-toast**: ^2.4.1 (Toast notifications)

### Build Tools
- **postcss**: ^8
- **autoprefixer**: ^10.0.1

---

## 🏗️ Project Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── globals.css           # Global styles + Tailwind imports
│   │   ├── layout.tsx            # Root layout (providers, metadata)
│   │   ├── page.tsx              # Homepage (auto-redirect logic)
│   │   ├── admin/                # Admin routes
│   │   │   ├── page.tsx          # User management dashboard
│   │   │   ├── docs/             # Document management
│   │   │   └── sessions/         # Session monitoring
│   │   ├── auth/                 # Authentication routes
│   │   │   ├── login/            
│   │   │   │   └── page.tsx      # Login page
│   │   │   └── register/
│   │   │       └── page.tsx      # Registration page
│   │   ├── chat/                 # Chat interface
│   │   │   └── page.tsx          # Chat page wrapper
│   │   └── upload/               # Upload interface
│   │       └── page.tsx          # Upload page wrapper
│   ├── components/               # React components
│   │   ├── ChatPage.tsx          # Main chat interface (880 lines)
│   │   ├── UploadPage.tsx        # Document upload interface (280 lines)
│   │   ├── ChatSidebar.tsx       # Chat sidebar with sessions
│   │   ├── AdminSidebar.tsx      # Admin navigation sidebar
│   │   ├── Navigation.tsx        # Top navigation bar
│   │   ├── ProtectedRoute.tsx    # Route protection HOC
│   │   ├── SessionManager.tsx    # Multi-session management
│   │   ├── SettingsModal.tsx     # Settings modal
│   │   ├── AccountSettingsModal.tsx
│   │   ├── PrivacySecurityModal.tsx
│   │   ├── ContactSupportModal.tsx
│   │   ├── LocationPermissionModal.tsx
│   │   └── LocationPermissionWrapper.tsx
│   │   └── ui/                   # UI components
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Loading.tsx
│   │       ├── ThemeToggle.tsx
│   │       └── index.ts
│   ├── contexts/                 # React contexts
│   │   ├── AuthContext.tsx       # Authentication state (178 lines)
│   │   ├── LocationContext.tsx   # Location permission state
│   │   └── ThemeContext.tsx      # Theme state (dark/light)
│   ├── lib/                      # Services & utilities
│   │   ├── auth.ts               # Authentication API client (200+ lines)
│   │   ├── chatService.ts        # Chat API service (351 lines)
│   │   ├── locationService.ts    # Location services
│   │   ├── utils.ts              # Utility functions (cn helper)
│   │   ├── clamp.ts              # Clamp utility
│   │   └── responsive.ts         # Responsive helpers
│   ├── hooks/                    # Custom React hooks
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useLocationPermission.ts
│   └── utils/                    # Additional utilities
│       ├── timezone.ts
│       └── settingsTest.ts
├── public/
│   └── icon/                     # App icons and images
│       ├── icon.png
│       └── icon1.png
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Root Layout                            │
│  (ThemeProvider → AuthProvider → LocationProvider)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    App Router (Next.js 14)                  │
├─────────────────────────────────────────────────────────────┤
│  / (Homepage)         → Auto-redirect based on auth & role  │
│  /auth/login          → Login page                          │
│  /auth/register       → Registration page                   │
│  /chat                → Chat interface (user role)          │
│  /upload              → Upload page (admin/uploader)        │
│  /admin               → User management (admin only)        │
│  /admin/docs          → Document management                 │
│  /admin/sessions      → Session monitoring                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Protected Routes                         │
│  (Role-based access control with ProtectedRoute HOC)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Services                             │
│  - authAPI (auth.ts)      → Backend auth endpoints          │
│  - chatService            → Chat & OpenAI Assistants        │
│  - locationService        → Location permissions            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation & Setup

### Prerequisites

- **Node.js**: 16.x or higher
- **npm** or **yarn**
- **Backend API**: Running on `http://localhost:8000` (default)

### Installation Steps

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   Create `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Verify installation**
   ```bash
   npm run dev
   ```

---

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

- Opens on `http://localhost:3000`
- Hot reload enabled
- TypeScript type checking in real-time

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Linting

```bash
npm run lint
```

---

## ✨ Features

### 1. **Authentication System**

#### Login & Registration
- Username/password authentication
- JWT token-based authentication
- Automatic token refresh
- Password visibility toggle
- Form validation with `react-hook-form`

#### Multi-Session Management
- Track active sessions across devices
- View device info, IP address, and location for each session
- Revoke specific sessions
- Logout from all devices
- Current session indicator

#### Role-Based Access Control
- **User**: Chat access only
- **Uploader**: Upload documents + chat
- **Admin**: Full access (upload, chat, user management)

### 2. **Chat Interface** (ChatPage.tsx - 880 lines)

#### Core Features
- **OpenAI Assistants API Integration**
  - `useAssistant = true` (hardcoded)
  - Advanced reasoning capabilities
  - Thread continuity support (`currentThreadId` state)
  
- **Session Management**
  - Multiple chat sessions
  - Session-based conversation grouping
  - Smart session titles (auto-generated from first message)
  - Session reordering (most recent first)
  
- **Message Features**
  - Send text messages
  - Receive AI responses
  - Message feedback (like/dislike)
  - Edit messages
  - Delete individual messages
  - Copy message content
  
- **UI Features**
  - Responsive sidebar (auto-close on mobile)
  - Collapsible sidebar (desktop: 64px collapsed, 256px open)
  - Auto-scroll to latest message
  - Loading indicators
  - Empty state for new chats
  
- **Markdown Rendering**
  - GitHub Flavored Markdown (GFM)
  - Code syntax highlighting
  - Tables support
  - Line breaks
  - Raw HTML support (sanitized)
  - Links (auto-open in new tab)

#### State Management
```typescript
// Key states in ChatPage.tsx
const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
const [currentSessionId, setCurrentSessionId] = useState<string>('')
const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
const [input, setInput] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [isSidebarOpen, setIsSidebarOpen] = useState(true)
const [messageFeedback, setMessageFeedback] = useState<{ [key: string]: 'like' | 'dislike' | null }>({})
const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
```

#### API Endpoints Used
- `POST /chat/openai-assistant` - Send message to OpenAI Assistant
- `GET /chat/history` - Load chat history
- `DELETE /chat/history/:id` - Delete specific message
- `DELETE /chat/session/:sessionId` - Delete entire session
- `DELETE /chat/history` - Clear all history

### 3. **Document Upload** (UploadPage.tsx - 280 lines)

#### Features
- **Drag & Drop Interface**
  - Visual drag-over state
  - Drop zone indicator
  
- **Multi-file Upload**
  - Upload multiple files at once
  - Individual file status tracking
  - Progress indication
  
- **Supported Formats**
  - PDF
  - DOCX
  - TXT
  - CSV
  - JSON
  - XLSX
  
- **Upload Status**
  - `uploading` - File being uploaded
  - `success` - Upload completed
  - `error` - Upload failed
  
- **File Information**
  - File name
  - File size (formatted)
  - Upload timestamp

#### API Endpoint
```typescript
POST http://localhost:8000/upload/
Headers: {
  Authorization: Bearer <token>
}
Body: FormData with file
```

### 4. **Admin Dashboard** (admin/page.tsx)

#### User Management
- View all users (table view)
- Add new users
- Edit user details
- Delete users
- Toggle user active/inactive status
- Filter by role (admin, user, uploader)
- Search users by username
- User statistics dashboard

#### User Information Displayed
- Username
- User ID
- Role (with color-coded badges)
- Active status
- Created date
- Last login date

### 5. **Settings & Personalization**

#### Theme Settings
- **Light Mode**: Classic bright theme
- **Dark Mode**: Eye-friendly dark theme
- **System Mode**: Auto-detect system preference

#### Account Settings
- Update username
- Update email
- Update phone number
- Upload profile image
- Update location
- Change password

#### Privacy & Security
- Two-factor authentication (2FA)
- Session timeout configuration
- Password policy settings
- Login attempts limit
- Data retention settings
- IP whitelist
- Audit logs
- Export user data

### 6. **Location Services**

#### Features
- Browser geolocation API integration
- Reverse geocoding (coordinates → city, country)
- Location permission modal
- Opt-in/opt-out support
- Location stored in user session
- Fallback to manual location entry

#### Permission Handling
- Request permission on first login
- Store permission state in localStorage
- Graceful error handling
- User can skip location sharing

---

## 🌐 Routing & Pages

### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/auth/login` | `auth/login/page.tsx` | Login page with username/password form |
| `/auth/register` | `auth/register/page.tsx` | User registration page |

### Protected Routes

| Route | Component | Allowed Roles | Description |
|-------|-----------|---------------|-------------|
| `/` | `app/page.tsx` | All | Homepage - auto-redirects based on role |
| `/chat` | `chat/page.tsx` | `user` | Chat interface (OpenAI Assistants) |
| `/upload` | `upload/page.tsx` | `admin`, `uploader` | Document upload interface |
| `/admin` | `admin/page.tsx` | `admin` | User management dashboard |
| `/admin/docs` | `admin/docs/page.tsx` | `admin` | Document management |
| `/admin/sessions` | `admin/sessions/page.tsx` | `admin` | Session monitoring |

### Route Protection Logic

```typescript
// ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('user' | 'admin' | 'uploader')[]
  redirectTo?: string
}

// Redirect logic in page.tsx
if (!isAuthenticated) {
  router.push('/auth/login')
} else if (user.role === 'admin' || user.role === 'uploader') {
  router.push('/upload')
} else {
  router.push('/chat')
}
```

---

## 🧩 Components

### Core Components

#### 1. **ChatPage.tsx** (880 lines)
Main chat interface component.

**Key Features:**
- OpenAI Assistants API integration (`useAssistant = true`)
- Thread continuity with `currentThreadId`
- Session management
- Message feedback system
- Responsive sidebar
- Markdown rendering

**State:**
```typescript
chatSessions: ChatSession[]
currentSessionId: string
currentThreadId: string | null
input: string
isLoading: boolean
isSidebarOpen: boolean
messageFeedback: { [key: string]: 'like' | 'dislike' | null }
editingMessageId: string | null
```

**Functions:**
- `handleSendMessage()` - Send message to OpenAI Assistant
- `handleNewChat()` - Create new chat session
- `handleSwitchSession(sessionId)` - Switch to different session
- `handleDeleteSession(sessionId)` - Delete session
- `handleClearAll()` - Clear all sessions
- `handleRefreshHistory()` - Sync with backend
- `generateSmartTitle(question)` - Generate session title

#### 2. **UploadPage.tsx** (280 lines)
Document upload interface.

**Key Features:**
- Drag & drop file upload
- Multi-file support
- Format validation
- Upload status tracking
- Progress indication

**State:**
```typescript
uploadedFiles: Array<{
  id: string
  name: string
  size: number
  status: 'uploading' | 'success' | 'error'
  uploadedAt: Date
}>
isUploading: boolean
dragActive: boolean
```

**Functions:**
- `handleFileUpload(files)` - Upload files to backend
- `handleDrag(e)` - Handle drag events
- `handleDrop(e)` - Handle file drop
- `formatFileSize(bytes)` - Format file size display

#### 3. **ChatSidebar.tsx**
Collapsible sidebar for chat sessions.

**Features:**
- Session list with titles
- New chat button
- Session switching
- Session deletion
- Clear all sessions
- Profile dropdown
- Settings modal trigger
- Responsive design (mobile overlay)

**Props:**
```typescript
interface ChatSidebarProps {
  isOpen: boolean
  chatSessions: ChatSession[]
  currentSessionId: string
  onClose?: () => void
  onToggle?: () => void
  onStartNewChat?: () => void
  onSwitchSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onClearAllSessions?: () => void
  onRefreshHistory?: () => void
}
```

#### 4. **AdminSidebar.tsx**
Navigation sidebar for admin routes.

**Features:**
- Logo display
- Navigation links (Upload, Users, Docs, Sessions)
- Active route highlighting
- Profile section
- Logout button

#### 5. **Navigation.tsx**
Top navigation bar.

**Features:**
- Role-based menu items
- Active route highlighting
- Theme toggle
- User profile display
- Logout button

#### 6. **SettingsModal.tsx**
Settings modal with tabs.

**Tabs:**
- **Personalization**: Theme selection (Light, Dark, System)
- **Settings**: Account & Privacy settings
- **Help**: FAQ and contact support

**Features:**
- Modal architecture
- Tab navigation
- Sub-modals (Account, Privacy, Contact)
- Responsive design

#### 7. **ProtectedRoute.tsx**
Higher-order component for route protection.

**Features:**
- Check authentication status
- Verify user role
- Auto-redirect unauthorized users
- Loading state

**Usage:**
```tsx
<ProtectedRoute allowedRoles={['user']}>
  <ChatPage />
</ProtectedRoute>
```

#### 8. **LocationPermissionModal.tsx**
Modal for requesting location permission.

**Features:**
- Permission request UI
- Allow/deny buttons
- Skip option
- Privacy information

### UI Components (`components/ui/`)

#### Badge.tsx
Colored badge component for status indicators.

#### Button.tsx
Reusable button component with variants.

#### Card.tsx
Card container component.

#### Input.tsx
Styled input component.

#### Loading.tsx
Loading spinner component with sizes:
- `sm` - Small (16px)
- `md` - Medium (24px)
- `lg` - Large (32px)

**Usage:**
```tsx
<Loading size="md" />
```

#### ThemeToggle.tsx
Theme switcher button (Sun/Moon icon).

---

## 🔐 Contexts & State Management

### 1. **AuthContext** (178 lines)

**Purpose**: Global authentication state management.

**State:**
```typescript
interface AuthContextType {
  user: User | null
  loading: boolean
  sessions: UserSession[]
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, role: string) => Promise<void>
  logout: () => Promise<void>
  logoutAllDevices: () => Promise<void>
  revokeSession: (sessionId: string) => Promise<void>
  refreshSessions: () => Promise<void>
  isAuthenticated: boolean
}
```

**Functions:**

**login(username, password)**
```typescript
// 1. Call authAPI.login() → POST /auth/login
// 2. Store JWT token in cookie (7 days)
// 3. Fetch user data → GET /auth/me
// 4. Trigger location permission request
// 5. Redirect based on role:
//    - admin/uploader → /upload
//    - user → /chat
```

**register(username, password, role)**
```typescript
// 1. Call authAPI.register() → POST /auth/register
// 2. Show success toast
// 3. Redirect to /auth/login
```

**logout()**
```typescript
// 1. Call authAPI.logout() → POST /auth/logout
// 2. Remove cookies (auth_token, session_id)
// 3. Clear user state
// 4. Redirect to /auth/login
```

**logoutAllDevices()**
```typescript
// 1. Call authAPI.logoutAllDevices() → POST /auth/logout-all
// 2. Remove all session tokens
// 3. Redirect to /auth/login
```

**User Object:**
```typescript
interface User {
  id: number
  username: string
  email?: string
  phone?: string
  profile_image?: string
  role: 'user' | 'admin' | 'uploader'
  location?: string
  created_at?: string
  last_login?: string
}
```

**Session Object:**
```typescript
interface UserSession {
  id: string
  device_info?: string
  ip_address?: string
  location?: string
  created_at: string
  last_active: string
  is_current: boolean
}
```

### 2. **LocationContext**

**Purpose**: Location permission and geolocation management.

**State:**
```typescript
interface LocationContextType {
  location: string | null
  isLoading: boolean
  hasRequestedPermission: boolean
  updateLocation: (location: string) => Promise<void>
  requestLocationPermission: () => Promise<void>
  clearLocation: () => void
}
```

**Functions:**

**requestLocationPermission()**
```typescript
// 1. Request browser geolocation permission
// 2. Get coordinates (latitude, longitude, accuracy)
// 3. Reverse geocode → "City, Country"
// 4. Update location in backend → POST /auth/update-location
// 5. Store in localStorage ('location-permission-requested')
```

**updateLocation(newLocation)**
```typescript
// 1. Send location to backend
// 2. Update local state
// 3. Show success toast
```

**Error Handling:**
- **PERMISSION_DENIED**: "Location access denied. You can set your location manually in settings."
- **POSITION_UNAVAILABLE**: "Location information is unavailable."
- **TIMEOUT**: "Location request timed out."

### 3. **ThemeContext**

**Purpose**: Dark/light mode theme management.

**State:**
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system'
  actualTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}
```

**Features:**
- Persist theme in localStorage
- System preference detection
- Auto-apply dark class to `<html>` element
- Listen to system theme changes

**Usage:**
```tsx
const { theme, actualTheme, setTheme } = useTheme()

// Set theme
setTheme('dark')      // Dark mode
setTheme('light')     // Light mode
setTheme('system')    // Follow system preference

// Get current theme
console.log(actualTheme) // 'dark' or 'light'
```

---

## 🔌 Services & API Integration

### 1. **authAPI** (lib/auth.ts - 200+ lines)

**Base URL**: `http://localhost:8000` (configurable via `NEXT_PUBLIC_API_URL`)

**Axios Configuration:**
- Base URL: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`
- Request interceptor: Add `Authorization: Bearer <token>` header
- Response interceptor: Handle 401 errors (remove cookies)

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login user |
| POST | `/auth/register` | Register new user |
| GET | `/auth/me` | Get current user info |
| GET | `/auth/sessions` | Get active sessions |
| DELETE | `/auth/sessions/:id` | Revoke specific session |
| POST | `/auth/logout` | Logout current session |
| POST | `/auth/logout-all` | Logout all devices |
| PUT | `/auth/update-profile` | Update user profile |
| POST | `/auth/upload-profile-image` | Upload profile image |
| POST | `/auth/change-password` | Change password |
| GET | `/auth/security-settings` | Get security settings |
| PUT | `/auth/security-settings` | Update security settings |
| POST | `/auth/two-factor/setup` | Setup 2FA |
| POST | `/auth/two-factor/verify` | Verify 2FA token |
| POST | `/auth/two-factor/disable` | Disable 2FA |
| POST | `/auth/data-export` | Export user data |
| GET | `/auth/audit-logs` | Get audit logs |

**Functions:**

**login(data: LoginData): LoginResponse**
```typescript
// Request
POST /auth/login
Body: { username: string, password: string }

// Response
{
  access_token: string
  token_type: string
  user: User
  session_id: string
}

// Side effects
- Store token in cookie (7 days)
- Store session_id in cookie
```

**register(data: RegisterData)**
```typescript
// Request
POST /auth/register
Body: { 
  username: string, 
  password: string, 
  role: 'user' | 'admin' | 'uploader' 
}
```

**getCurrentUser(): User**
```typescript
// Request
GET /auth/me
Headers: { Authorization: Bearer <token> }

// Response
{
  id: number
  username: string
  email?: string
  phone?: string
  profile_image?: string
  role: string
  location?: string
  created_at?: string
  last_login?: string
}
```

**getActiveSessions(): UserSession[]**
```typescript
// Request
GET /auth/sessions

// Response
[{
  id: string
  device_info?: string
  ip_address?: string
  location?: string
  created_at: string
  last_active: string
  is_current: boolean
}]
```

**updateProfile(profileData): User**
```typescript
// Request
PUT /auth/update-profile
Body: {
  username?: string
  email?: string
  phone?: string
  profile_image?: string
  location?: string
}
```

**uploadProfileImage(file: File)**
```typescript
// Request
POST /auth/upload-profile-image
Content-Type: multipart/form-data
Body: FormData { file: File }

// Response
{ profile_image: string }
```

### 2. **chatService** (lib/chatService.ts - 351 lines)

**Base URL**: `http://localhost:8000`

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/openai-tools` | Send message (OpenAI Tools) |
| POST | `/chat/openai-assistant` | Send message (OpenAI Assistants API) |
| GET | `/chat/history` | Load chat history |
| DELETE | `/chat/history/:id` | Delete specific message |
| DELETE | `/chat/session/:sessionId` | Delete entire session |
| DELETE | `/chat/history` | Clear all history |

**Data Types:**

```typescript
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  lastUpdated: Date
}

interface BackendChatHistory {
  id: number
  question: string
  answer: string
  created_at: string
  session_id?: string
}
```

**Functions:**

**sendMessageWithAssistant(question, sessionId?, threadId?)**
```typescript
// Request
POST /chat/openai-assistant
Headers: { Authorization: Bearer <token> }
Body: {
  question: string
  session_id?: string  // For session grouping
  thread_id?: string   // For conversation continuity
}

// Response
{
  answer: string
  session_id: string
  thread_id: string
}

// Notes
- Used by ChatPage.tsx (useAssistant = true)
- Maintains thread continuity across messages
- Returns thread_id for next message in conversation
```

**loadChatHistory(): BackendChatHistory[]**
```typescript
// Request
GET /chat/history

// Response
{
  history: [{
    id: number
    question: string
    answer: string
    created_at: string
    session_id?: string
  }]
}
```

**convertBackendHistoryToSessions(history): ChatSession[]**
```typescript
// Groups backend history by session_id
// Converts to frontend ChatSession format
// Sorts by lastUpdated (newest first)
// Generates smart titles from first question
```

**generateSmartTitle(question): string**
```typescript
// Remove common prefixes (tolong, bisa, mohon, etc.)
// Remove punctuation
// Limit to 50 characters
// Capitalize first letter

Examples:
"tolong jelaskan tentang React" → "Jelaskan tentang React"
"bagaimana cara menggunakan Next.js?" → "Cara menggunakan Next.js"
```

**syncWithBackend(): ChatSession[]**
```typescript
// 1. Load backend history (grouped by session_id)
// 2. Load localStorage sessions
// 3. Smart merge (backend = source of truth)
// 4. Save merged sessions to localStorage
// 5. Return merged sessions
```

**LocalStorage Management:**
- Key: `chatSessions`
- Format: JSON array of ChatSession objects
- Auto-sync on app load
- Persist on session changes

### 3. **locationService** (lib/locationService.ts)

**Functions:**

**updateLocation(locationData): void**
```typescript
// Request
POST /auth/update-location
Headers: { Authorization: Bearer <token> }
Body: {
  location: string
  latitude?: number
  longitude?: number
  accuracy?: number
}
```

**getCurrentLocation(): GeolocationPosition**
```typescript
// Uses browser geolocation API
navigator.geolocation.getCurrentPosition(
  resolve,
  reject,
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000  // 5 minutes cache
  }
)
```

**reverseGeocode(lat, lon): string**
```typescript
// Uses BigDataCloud API (free)
// Returns: "City, Country"
// Fallback: Coordinates if API fails
```

**checkLocationPermission(): PermissionState**
```typescript
// Returns: 'granted', 'denied', or 'prompt'
// Uses navigator.permissions API
```

---

## 🎨 Styling & Theming

### Tailwind CSS Configuration

**File**: `tailwind.config.js`

```javascript
module.exports = {
  darkMode: 'class',  // Dark mode via .dark class
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
        primary: {
          DEFAULT: '#1A829B',  // Main brand color
          hover: '#146B7C',
          light: '#B3E5E8',
          lighter: '#E5F5F6',
        },
      },
    },
  },
  plugins: [],
}
```

### Global Styles

**File**: `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark mode variables */
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

.dark {
  --foreground-rgb: 255, 255, 255;
  --background-start-rgb: 0, 0, 0;
  --background-end-rgb: 0, 0, 0;
}
```

### Color Scheme

**Light Mode:**
- Background: `#FFFFFF`, `#F8FAFC`
- Text: `#1F2937`, `#4B5563`
- Primary: `#1A829B`
- Accent: `#B3E5E8`, `#E5F5F6`

**Dark Mode:**
- Background: `#1F2937`, `#111827`
- Text: `#F9FAFB`, `#E5E7EB`
- Primary: `#4DA8B8`
- Accent: `#1A829B`

### Responsive Breakpoints

```javascript
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large desktop
```

### Theme Implementation

**ThemeProvider** applies theme class to `<html>` element:

```tsx
// ThemeContext.tsx
useEffect(() => {
  const root = document.documentElement
  if (actualTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}, [actualTheme])
```

**Usage in Components:**

```tsx
// Light/Dark mode styles
<div className="bg-white dark:bg-gray-800">
  <p className="text-gray-900 dark:text-gray-100">
    This text adapts to theme
  </p>
</div>
```

### Utility Function: `cn()`

**File**: `lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Purpose**: Merge Tailwind classes conditionally.

**Usage:**
```tsx
<div className={cn(
  "px-4 py-2 rounded-lg",
  isActive && "bg-blue-500 text-white",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

---

## 🔒 Authentication Flow

### Login Flow

```
1. User visits /auth/login
   ↓
2. Enter username & password
   ↓
3. Click "Sign In"
   ↓
4. Frontend: authAPI.login(username, password)
   ↓
5. Backend: POST /auth/login
   ↓
6. Backend validates credentials
   ↓
7. Backend returns JWT token + session_id
   ↓
8. Frontend stores token in cookie (7 days)
   ↓
9. Frontend: authAPI.getCurrentUser()
   ↓
10. Backend: GET /auth/me (with token in header)
    ↓
11. Backend returns user data
    ↓
12. Frontend updates AuthContext.user
    ↓
13. Frontend triggers location permission modal
    ↓
14. Frontend redirects based on role:
    - admin/uploader → /upload
    - user → /chat
```

### Protected Route Flow

```
1. User navigates to protected route (e.g., /chat)
   ↓
2. ProtectedRoute component checks:
   - isAuthenticated (from AuthContext)
   - user role (from AuthContext)
   ↓
3. If NOT authenticated:
   → Redirect to /auth/login
   ↓
4. If role NOT allowed:
   → Redirect based on user role
      - admin/uploader → /upload
      - user → /chat
   ↓
5. If authenticated & role allowed:
   → Render protected content
```

### Token Management

**Storage**: HTTP-only cookies (via `js-cookie`)

**Token Lifecycle:**
- **Expiry**: 7 days
- **Storage location**: `auth_token` cookie
- **Auto-refresh**: Not implemented (token must be re-obtained after expiry)

**Axios Interceptors:**

```typescript
// Request interceptor: Add token to headers
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token')
      // User will be redirected to login by AuthContext
    }
    return Promise.reject(error)
  }
)
```

### Multi-Session Management

**Features:**
- Track all active sessions
- View device info, IP, location for each session
- Revoke specific session
- Logout from all devices
- Current session indicator

**Implementation:**

```typescript
// Get active sessions
const sessions = await authAPI.getActiveSessions()

// Session object structure
{
  id: string
  device_info?: string      // e.g., "Chrome on Windows"
  ip_address?: string       // e.g., "192.168.1.1"
  location?: string         // e.g., "Jakarta, Indonesia"
  created_at: string
  last_active: string
  is_current: boolean       // Current session flag
}

// Revoke specific session
await authAPI.revokeSession(sessionId)

// Logout from all devices
await authAPI.logoutAllDevices()
```

---

## ⚙️ Environment Configuration

### Environment Variables

Create `.env.local` file in frontend root:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Enable debug mode
NEXT_PUBLIC_DEBUG=false
```

### Configuration Files

#### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
```

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 🚢 Deployment

### Production Build

```bash
# Build the application
npm run build

# Output: .next/ folder with optimized build
```

### Deployment Platforms

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Production deployment
vercel --prod
```

**Environment Variables** (set in Vercel dashboard):
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., `https://api.yourdomain.com`)

#### Docker Deployment

**Dockerfile** (create in frontend root):

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**Build & Run:**

```bash
# Build Docker image
docker build -t docai-frontend .

# Run container
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8000 docai-frontend
```

### Performance Optimization

**Automatic Optimizations:**
- Image optimization (next/image)
- Code splitting
- Tree shaking
- Minification
- Gzip compression

**Manual Optimizations:**
- Dynamic imports for large components
- Lazy loading for modals
- Debounced search inputs
- Memoized components with React.memo
- useMemo/useCallback for expensive computations

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **"Cannot connect to backend API"**

**Symptoms:**
- Login fails with network error
- Chat messages don't send
- 404 errors in console

**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/

# Check environment variable
echo $NEXT_PUBLIC_API_URL

# Update .env.local if needed
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 2. **"Token expired" or constant redirects to login**

**Symptoms:**
- User logged out automatically
- 401 errors in console
- Can't access protected routes

**Solution:**
```typescript
// Clear cookies and login again
// Or check token expiry in backend (default: 7 days)

// In browser console:
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
})
```

#### 3. **Dark mode not working**

**Symptoms:**
- Theme doesn't change
- Stuck in light/dark mode

**Solution:**
```typescript
// Clear localStorage
localStorage.removeItem('theme')

// Or manually set theme
localStorage.setItem('theme', 'dark')

// Refresh page
window.location.reload()
```

#### 4. **Location permission not working**

**Symptoms:**
- Location modal doesn't appear
- Location always shows as denied

**Solution:**
```typescript
// Clear location permission state
localStorage.removeItem('location-permission-requested')

// Check browser location permission
// Chrome: Settings → Privacy → Site Settings → Location
// Firefox: Settings → Privacy → Permissions → Location
```

#### 5. **Chat history not loading**

**Symptoms:**
- Empty chat sessions
- Messages don't persist

**Solution:**
```typescript
// Check backend API is returning history
// GET /chat/history should return:
{
  history: [
    {
      id: 1,
      question: "test",
      answer: "response",
      created_at: "2025-01-01T00:00:00",
      session_id: "session_123"
    }
  ]
}

// Clear localStorage cache
localStorage.removeItem('chatSessions')

// Refresh chat history
// Click refresh button in ChatSidebar
```

#### 6. **File upload fails**

**Symptoms:**
- Upload stuck at "uploading"
- 413 or 500 errors

**Solution:**
```bash
# Check backend file size limit
# Default: 10MB per file

# Check supported formats
# Allowed: PDF, DOCX, TXT, CSV, JSON, XLSX

# Check backend is processing uploads
# POST /upload/ endpoint should be available
```

#### 7. **Build errors**

**Symptoms:**
- `npm run build` fails
- TypeScript errors

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Fix TypeScript errors
npm run build
```

### Debug Mode

Enable verbose logging:

```typescript
// Add to .env.local
NEXT_PUBLIC_DEBUG=true

// Use in code
if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
  console.log('Debug info:', data)
}
```

---

## 📚 Additional Resources

### Dependencies Documentation

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [React 18 Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [Axios Documentation](https://axios-http.com/docs/intro)

### API Endpoints Reference

See **Backend README** for complete API documentation:
- `/backend/README.md`

### Project Links

- **Frontend Repository**: `frontend/`
- **Backend Repository**: `backend/`
- **Documentation**: This file

---

## 📝 Notes

### Important Implementation Details

1. **OpenAI Assistants API**
   - Hardcoded in ChatPage.tsx: `useAssistant = true`
   - Uses `/chat/openai-assistant` endpoint
   - Thread continuity with `thread_id`

2. **Session Management**
   - Backend groups messages by `session_id`
   - Frontend converts to ChatSession format
   - LocalStorage used for offline access
   - Smart merge between backend and localStorage

3. **Smart Titles**
   - Auto-generated from first user message
   - Removes common prefixes (tolong, bisa, mohon, etc.)
   - Capitalizes first letter
   - Limits to 50 characters

4. **Responsive Design**
   - Mobile: Sidebar overlay with backdrop
   - Desktop: Collapsible sidebar (16px/256px)
   - Auto-close sidebar on mobile after actions

5. **Location Services**
   - Opt-in modal after first login
   - Browser geolocation API
   - Reverse geocoding (coordinates → city, country)
   - Fallback to manual entry

6. **Theme Persistence**
   - Stored in localStorage
   - System preference detection
   - Auto-apply on page load

---

## ✅ Changelog

### Version 1.0.0 (2025)
- ✅ Initial release
- ✅ OpenAI Assistants API integration
- ✅ Multi-session chat management
- ✅ Document upload with drag & drop
- ✅ Role-based access control
- ✅ Dark mode support
- ✅ Location services
- ✅ Multi-device session management
- ✅ Admin dashboard for user management

---

**Last Updated**: 2025  
**Maintained by**: DocAI Development Team  
**Version**: 1.0.0  
**License**: Proprietary

---

*This documentation is 100% accurate and reflects the actual implementation of the DocAI frontend application.*
