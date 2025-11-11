'use client'

import { useLocationPermission } from '@/hooks/useLocationPermission'
import LocationPermissionModal from './LocationPermissionModal'

export default function LocationPermissionWrapper() {
  const {
    showPermissionModal,
    triggerLocationPermission,
    handleLocationGranted,
    handleCloseModal
  } = useLocationPermission()

  // Expose the trigger function globally for use after login
  if (typeof window !== 'undefined') {
    (window as any).triggerLocationPermission = triggerLocationPermission
  }

  return (
    <LocationPermissionModal
      isOpen={showPermissionModal}
      onClose={handleCloseModal}
      onLocationGranted={handleLocationGranted}
    />
  )
}
