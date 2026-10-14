import type { CalculationMethodId } from '../constants/prayer'

export interface City {
  id: string
  name: string
  country: string
  latitude: number
  longitude: number
  timezone: string
  /** The method most commonly used in this region; offered as a suggestion only. */
  method: CalculationMethodId
}

export const CITIES: readonly City[] = [
  { id: 'alexandria', name: 'Alexandria', country: 'Egypt', latitude: 31.2001, longitude: 29.9187, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'giza', name: 'Giza', country: 'Egypt', latitude: 30.0131, longitude: 31.2089, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'mansoura', name: 'Mansoura', country: 'Egypt', latitude: 31.0409, longitude: 31.3785, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'tanta', name: 'Tanta', country: 'Egypt', latitude: 30.7865, longitude: 31.0004, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'port-said', name: 'Port Said', country: 'Egypt', latitude: 31.2653, longitude: 32.3019, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'assiut', name: 'Assiut', country: 'Egypt', latitude: 27.1783, longitude: 31.1859, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'luxor', name: 'Luxor', country: 'Egypt', latitude: 25.6872, longitude: 32.6396, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'aswan', name: 'Aswan', country: 'Egypt', latitude: 24.0889, longitude: 32.8998, timezone: 'Africa/Cairo', method: 'Egyptian' },
  { id: 'makkah', name: 'Makkah', country: 'Saudi Arabia', latitude: 21.4225, longitude: 39.8262, timezone: 'Asia/Riyadh', method: 'UmmAlQura' },
  { id: 'madinah', name: 'Madinah', country: 'Saudi Arabia', latitude: 24.4672, longitude: 39.6111, timezone: 'Asia/Riyadh', method: 'UmmAlQura' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', latitude: 24.7136, longitude: 46.6753, timezone: 'Asia/Riyadh', method: 'UmmAlQura' },
  { id: 'jeddah', name: 'Jeddah', country: 'Saudi Arabia', latitude: 21.5433, longitude: 39.1728, timezone: 'Asia/Riyadh', method: 'UmmAlQura' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai', method: 'Dubai' },
  { id: 'abu-dhabi', name: 'Abu Dhabi', country: 'United Arab Emirates', latitude: 24.4539, longitude: 54.3773, timezone: 'Asia/Dubai', method: 'Dubai' },
  { id: 'doha', name: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.531, timezone: 'Asia/Qatar', method: 'Qatar' },
  { id: 'kuwait-city', name: 'Kuwait City', country: 'Kuwait', latitude: 29.3759, longitude: 47.9774, timezone: 'Asia/Kuwait', method: 'Kuwait' },
  { id: 'manama', name: 'Manama', country: 'Bahrain', latitude: 26.2285, longitude: 50.586, timezone: 'Asia/Bahrain', method: 'UmmAlQura' },
  { id: 'muscat', name: 'Muscat', country: 'Oman', latitude: 23.588, longitude: 58.3829, timezone: 'Asia/Muscat', method: 'UmmAlQura' },
  { id: 'amman', name: 'Amman', country: 'Jordan', latitude: 31.9454, longitude: 35.9284, timezone: 'Asia/Amman', method: 'MuslimWorldLeague' },
  { id: 'jerusalem', name: 'Jerusalem', country: 'Palestine', latitude: 31.7683, longitude: 35.2137, timezone: 'Asia/Jerusalem', method: 'MuslimWorldLeague' },
  { id: 'gaza', name: 'Gaza', country: 'Palestine', latitude: 31.5017, longitude: 34.4668, timezone: 'Asia/Gaza', method: 'Egyptian' },
  { id: 'beirut', name: 'Beirut', country: 'Lebanon', latitude: 33.8938, longitude: 35.5018, timezone: 'Asia/Beirut', method: 'MuslimWorldLeague' },
  { id: 'damascus', name: 'Damascus', country: 'Syria', latitude: 33.5138, longitude: 36.2765, timezone: 'Asia/Damascus', method: 'Egyptian' },
  { id: 'baghdad', name: 'Baghdad', country: 'Iraq', latitude: 33.3152, longitude: 44.3661, timezone: 'Asia/Baghdad', method: 'MuslimWorldLeague' },
  { id: 'khartoum', name: 'Khartoum', country: 'Sudan', latitude: 15.5007, longitude: 32.5599, timezone: 'Africa/Khartoum', method: 'Egyptian' },
  { id: 'tripoli', name: 'Tripoli', country: 'Libya', latitude: 32.8872, longitude: 13.1913, timezone: 'Africa/Tripoli', method: 'Egyptian' },
  { id: 'tunis', name: 'Tunis', country: 'Tunisia', latitude: 36.8065, longitude: 10.1815, timezone: 'Africa/Tunis', method: 'MuslimWorldLeague' },
  { id: 'algiers', name: 'Algiers', country: 'Algeria', latitude: 36.7538, longitude: 3.0588, timezone: 'Africa/Algiers', method: 'MuslimWorldLeague' },
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', latitude: 33.5731, longitude: -7.5898, timezone: 'Africa/Casablanca', method: 'MuslimWorldLeague' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul', method: 'Turkey' },
  { id: 'ankara', name: 'Ankara', country: 'Türkiye', latitude: 39.9334, longitude: 32.8597, timezone: 'Europe/Istanbul', method: 'Turkey' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', latitude: 35.6892, longitude: 51.389, timezone: 'Asia/Tehran', method: 'Tehran' },
  { id: 'karachi', name: 'Karachi', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011, timezone: 'Asia/Karachi', method: 'Karachi' },
  { id: 'lahore', name: 'Lahore', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587, timezone: 'Asia/Karachi', method: 'Karachi' },
  { id: 'islamabad', name: 'Islamabad', country: 'Pakistan', latitude: 33.6844, longitude: 73.0479, timezone: 'Asia/Karachi', method: 'Karachi' },
  { id: 'delhi', name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', method: 'Karachi' },
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka', method: 'Karachi' },
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', country: 'Malaysia', latitude: 3.139, longitude: 101.6869, timezone: 'Asia/Kuala_Lumpur', method: 'Singapore' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', method: 'Singapore' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta', method: 'Singapore' },
  { id: 'london', name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', method: 'MoonsightingCommittee' },
  { id: 'paris', name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris', method: 'MuslimWorldLeague' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin', method: 'MuslimWorldLeague' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam', method: 'MuslimWorldLeague' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', latitude: 59.3293, longitude: 18.0686, timezone: 'Europe/Stockholm', method: 'MuslimWorldLeague' },
  { id: 'new-york', name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', method: 'NorthAmerica' },
  { id: 'chicago', name: 'Chicago', country: 'United States', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago', method: 'NorthAmerica' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles', method: 'NorthAmerica' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto', method: 'NorthAmerica' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney', method: 'MuslimWorldLeague' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792, timezone: 'Africa/Lagos', method: 'MuslimWorldLeague' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', latitude: -1.2921, longitude: 36.8219, timezone: 'Africa/Nairobi', method: 'MuslimWorldLeague' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', latitude: -26.2041, longitude: 28.0473, timezone: 'Africa/Johannesburg', method: 'MuslimWorldLeague' }
]

export function findCity(id: string | null): City | undefined {
  return id ? CITIES.find((c) => c.id === id) : undefined
}
