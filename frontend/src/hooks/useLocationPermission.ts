'use client'

import { useLocation } from '@/contexts/LocationContext'
import { useState } from 'react'

export const useLocationPermission = () => {
  const { location, hasRequestedPermission, requestLocationPermission, updateLocation } = useLocation()
  const [showPermissionModal, setShowPermissionModal] = useState(false)

  // Function to trigger location permission modal (called after login)
  const triggerLocationPermission = () => {
    if (!hasRequestedPermission && !location) {
      setShowPermissionModal(true)
    }
  }

  // Note: Automatic trigger removed - now only triggered after login

  const handleLocationGranted = async (locationString: string) => {
    try {
      await updateLocation(locationString)
      setShowPermissionModal(false)
    } catch (error) {
      console.error('Error updating location:', error)
    }
  }

  const handleCloseModal = () => {
    setShowPermissionModal(false)
  }

  const requestPermission = async () => {
    try {
      await requestLocationPermission()
      setShowPermissionModal(false)
    } catch (error) {
      console.error('Error requesting location permission:', error)
    }
  }

  return {
    location,
    hasRequestedPermission,
    showPermissionModal,
    triggerLocationPermission,
    handleLocationGranted,
    handleCloseModal,
    requestPermission
  }
}
