'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from '@/contexts/LocationContext'
import { authAPI } from '@/lib/auth'
import {
  Calendar,
  Camera,
  Edit3,
  Key,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user, sessions } = useAuth()
  const { location: userLocation, updateLocation } = useLocation()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: ''
  })
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    joinDate: '',
    bio: '',
    role: '',
    profileImage: ''
  })

  const [editedData, setEditedData] = useState(profileData)

  // Initialize profile data from user context
  useEffect(() => {
    if (user) {
      const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      // Get location from context or current session
      const currentSession = sessions.find(session => session.is_current)
      const sessionLocation = currentSession?.location || ''
      const userRecordLocation = user.location || ''
      const finalLocation = userLocation || sessionLocation || userRecordLocation

      const userData = {
        name: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        location: finalLocation,
        joinDate: user.created_at ? formatDate(user.created_at) : 'Recently joined',
        bio: '', // Bio not available in current user model
        role: user.role || '',
        profileImage: user.profile_image || ''
      }
      setProfileData(userData)
      setEditedData(userData)
    }
  }, [user, sessions])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Prepare profile update data
      const updateData: any = {}
      
      if (editedData.name !== profileData.name) {
        updateData.username = editedData.name
      }
      
      if (editedData.email !== profileData.email) {
        updateData.email = editedData.email
      }
      
      if (editedData.phone !== profileData.phone) {
        updateData.phone = editedData.phone
      }
      
      if (editedData.profileImage !== profileData.profileImage) {
        updateData.profile_image = editedData.profileImage
      }
      
      // Update profile if there are changes
      if (Object.keys(updateData).length > 0) {
        await authAPI.updateProfile(updateData)
      }
      
      // Update location if it changed (persist to user via updateProfile and session via updateLocation)
      if (editedData.location !== profileData.location) {
        try {
          await authAPI.updateProfile({ location: editedData.location })
        } catch {}
        await updateLocation(editedData.location)
      }
      
      toast.success('Profile updated successfully!')
      setProfileData(editedData)
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditedData(profileData)
    setIsEditing(false)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploadingImage(true)

    try {
      // Upload image using the new endpoint (returns URL)
      const result = await authAPI.uploadProfileImage(file)
      
      // Normalize URL to absolute in case backend returns relative
      const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
      const imageUrl = result.profile_image?.startsWith('http')
        ? result.profile_image
        : `${apiBase}${result.profile_image}`
      // Update local state with URL
      const updatedProfileData = { ...profileData, profileImage: imageUrl }
      setProfileData(updatedProfileData)
      setEditedData(updatedProfileData)
      
      toast.success('Profile image updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleSubmitChangePassword = async () => {
    try {
      if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_new_password) {
        toast.error('Please fill all password fields')
        return
      }
      if (passwordForm.new_password !== passwordForm.confirm_new_password) {
        toast.error('New passwords do not match')
        return
      }
      await authAPI.changePassword(passwordForm)
      toast.success('Password changed successfully')
      setIsChangePasswordOpen(false)
      setPasswordForm({ current_password: '', new_password: '', confirm_new_password: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e.message || 'Failed to change password')
    }
  }

  const handleRemoveImage = async () => {
    try {
      await authAPI.updateProfile({ profile_image: '' })
      
      const updatedProfileData = { ...profileData, profileImage: '' }
      setProfileData(updatedProfileData)
      setEditedData(updatedProfileData)
      
      toast.success('Profile image removed successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove image')
    }
  }

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-[#1A829B]" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Profile Picture */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              {profileData.profileImage ? (
                <img
                  src={profileData.profileImage}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-20 h-20 bg-[#1A829B] rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {profileData.name ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                </div>
              )}
              <button 
                onClick={handleImageClick}
                disabled={isUploadingImage}
                className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{profileData.name || 'User'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Member since {profileData.joinDate}</p>
              {profileData.role && (
                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-[#1A829B]/10 text-[#1A829B] rounded-full">
                  {profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)}
                </span>
              )}
              {profileData.profileImage && (
                <button
                  onClick={handleRemoveImage}
                  className="mt-2 px-3 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  Remove Image
                </button>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.name}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">{profileData.name || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedData.email}
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                  placeholder="Enter your email address"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">{profileData.email || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedData.phone}
                  onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">{profileData.phone || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.location}
                  onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                  placeholder="Enter your location (City, Country)"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">{profileData.location || 'Not set'}</span>
                </div>
              )}
            </div>



            {/* Role (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100 capitalize">{profileData.role || 'Not set'}</span>
              </div>
            </div>

            {/* Join Date (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Member Since
              </label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{profileData.joinDate}</span>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Security</h4>
            <div className="space-y-3">
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center text-left gap-3">
                  <Key className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Change Password</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
                  </div>
                </div>
                <Shield className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
    {/* Mount change password modal */}
    <ChangePasswordModal
      isOpen={isChangePasswordOpen}
      onClose={() => setIsChangePasswordOpen(false)}
      values={passwordForm}
      onChange={(field, value) => setPasswordForm((prev) => ({ ...prev, [field]: value }))}
      onSubmit={handleSubmitChangePassword}
    />
    </>
  )
}

// Change Password Modal (inline component at bottom to keep file self-contained)
function ChangePasswordModal({
  isOpen,
  onClose,
  values,
  onChange,
  onSubmit,
  isSubmitting
}: {
  isOpen: boolean
  onClose: () => void
  values: { current_password: string; new_password: string; confirm_new_password: string }
  onChange: (field: 'current_password' | 'new_password' | 'confirm_new_password', value: string) => void
  onSubmit: () => void
  isSubmitting?: boolean
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[#1A829B]" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Change Password</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
            <input
              type="password"
              value={values.current_password}
              onChange={(e) => onChange('current_password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              value={values.new_password}
              onChange={(e) => onChange('new_password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={values.confirm_new_password}
              onChange={(e) => onChange('confirm_new_password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={onSubmit} disabled={isSubmitting} className="px-4 py-2 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
