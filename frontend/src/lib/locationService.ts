import { authAPI } from './auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface LocationData {
  location: string
  latitude?: number
  longitude?: number
  accuracy?: number
}

export const locationService = {
  // Update user session location
  updateLocation: async (locationData: LocationData): Promise<void> => {
    try {
      const token = authAPI.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('Updating location:', locationData)
      console.log('API URL:', `${API_BASE_URL}/auth/update-location`)

      const response = await fetch(`${API_BASE_URL}/auth/update-location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Failed to update location: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Location update successful:', result)
      return result
    } catch (error) {
      console.error('Error updating location:', error)
      throw error
    }
  },

  // Get current location using browser geolocation
  getCurrentLocation: (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

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
  },

  // Reverse geocoding to get city and country from coordinates
  reverseGeocode: async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      )
      const data = await response.json()
      
      const city = data.city || data.locality || 'Unknown City'
      const country = data.countryName || 'Unknown Country'
      
      return `${city}, ${country}`
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
      // Fallback to coordinates
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    }
  },

  // Check if location permission is granted
  checkLocationPermission: async (): Promise<PermissionState> => {
    if (!navigator.permissions) {
      return 'prompt'
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      return result.state
    } catch (error) {
      console.error('Error checking location permission:', error)
      return 'prompt'
    }
  },

  // Request location permission and get location
  requestLocation: async (): Promise<LocationData> => {
    try {
      const position = await locationService.getCurrentLocation()
      const { latitude, longitude, accuracy } = position.coords
      
      // Get human-readable location
      const locationString = await locationService.reverseGeocode(latitude, longitude)
      
      return {
        location: locationString,
        latitude,
        longitude,
        accuracy
      }
    } catch (error) {
      console.error('Error getting location:', error)
      throw error
    }
  }
}
