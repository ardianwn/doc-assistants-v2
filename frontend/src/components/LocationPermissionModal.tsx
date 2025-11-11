'use client'

import { AlertCircle, CheckCircle, Loader2, MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LocationPermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationGranted: (location: string) => void
}

export default function LocationPermissionModal({ 
  isOpen, 
  onClose, 
  onLocationGranted 
}: LocationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setError(null)
      setLocation('')
      setIsRequesting(false)
    }
  }, [isOpen])

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }

    setIsRequesting(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        )
      })

      const { latitude, longitude } = position.coords
      
      // Reverse geocoding to get city and country
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        )
        const data = await response.json()
        
        const city = data.city || data.locality || 'Unknown City'
        const country = data.countryName || 'Unknown Country'
        const locationString = `${city}, ${country}`
        
        setLocation(locationString)
        onLocationGranted(locationString)
        
        // Auto close modal after successful location detection
        setTimeout(() => {
          onClose()
        }, 2000)
        
      } catch (geocodeError) {
        // Fallback to coordinates if reverse geocoding fails
        const locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        setLocation(locationString)
        onLocationGranted(locationString)
        
        setTimeout(() => {
          onClose()
        }, 2000)
      }
      
    } catch (err: any) {
      console.error('Error getting location:', err)
      
      let errorMessage = 'Unable to get your location.'
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location access denied. You can set your location manually in settings.'
          break
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.'
          break
        case err.TIMEOUT:
          errorMessage = 'Location request timed out.'
          break
        default:
          errorMessage = 'An error occurred while retrieving location.'
          break
      }
      
      setError(errorMessage)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const handleManualEntry = () => {
    const manualLocation = prompt('Please enter your location (City, Country):')
    if (manualLocation && manualLocation.trim()) {
      onLocationGranted(manualLocation.trim())
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-[#1A829B]" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Location Access
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#1A829B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-[#1A829B]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Help us personalize your experience
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              We'd like to access your location to provide better services and security features. 
              This helps us detect unusual login activity and improve your experience.
            </p>
          </div>

          {/* Location Status */}
          {location && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-800 dark:text-green-200 text-sm">
                  Location detected: {location}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-800 dark:text-red-200 text-sm">
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={getCurrentLocation}
              disabled={isRequesting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Detecting location...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Allow Location Access
                </>
              )}
            </button>

            <button
              onClick={handleManualEntry}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Enter Location Manually
            </button>

            <button
              onClick={handleSkip}
              className="w-full px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Skip for now
            </button>
          </div>

          {/* Privacy Notice */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Privacy:</strong> Your location is only used to enhance security and user experience. 
              You can change or remove this information anytime in your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
