'use client'

import { locationService } from '@/lib/locationService'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface LocationContextType {
  location: string | null
  isLoading: boolean
  hasRequestedPermission: boolean
  updateLocation: (location: string) => Promise<void>
  requestLocationPermission: () => Promise<void>
  clearLocation: () => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}

interface LocationProviderProps {
  children: ReactNode
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false)

  // Check if location permission has been requested before
  useEffect(() => {
    const hasRequested = localStorage.getItem('location-permission-requested')
    setHasRequestedPermission(hasRequested === 'true')
  }, [])

  const updateLocation = async (newLocation: string) => {
    setIsLoading(true)
    try {
      // Update location in backend
      await locationService.updateLocation({ location: newLocation })
      
      // Update local state
      setLocation(newLocation)
      
      // Mark as requested
      setHasRequestedPermission(true)
      localStorage.setItem('location-permission-requested', 'true')
      
      toast.success('Location updated successfully!')
    } catch (error: any) {
      console.error('Error updating location:', error)
      toast.error(error.message || 'Failed to update location')
    } finally {
      setIsLoading(false)
    }
  }

  const requestLocationPermission = async () => {
    setIsLoading(true)
    try {
      const locationData = await locationService.requestLocation()
      await updateLocation(locationData.location)
    } catch (error: any) {
      console.error('Error requesting location:', error)
      
      let errorMessage = 'Unable to get your location.'
      
      if (error.code === 1) { // PERMISSION_DENIED
        errorMessage = 'Location access denied. You can set your location manually in settings.'
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        errorMessage = 'Location information is unavailable.'
      } else if (error.code === 3) { // TIMEOUT
        errorMessage = 'Location request timed out.'
      }
      
      toast.error(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const clearLocation = () => {
    setLocation(null)
    localStorage.removeItem('location-permission-requested')
    setHasRequestedPermission(false)
  }

  const value: LocationContextType = {
    location,
    isLoading,
    hasRequestedPermission,
    updateLocation,
    requestLocationPermission,
    clearLocation
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}
