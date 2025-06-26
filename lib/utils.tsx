import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SongRequest, PlannedRequest } from "./types"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format duration from seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00"
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Format duration from seconds (alternative name for consistency)
 */
export function formatDurationFromSeconds(seconds: number): string {
  return formatDuration(seconds)
}

/**
 * Calculate total duration of queue in seconds
 */
export function calculateTotalQueueDuration(queue: SongRequest[]): number {
  return queue.reduce((total, song) => total + (song.durationSeconds || 0), 0)
}

/**
 * Format timestamp to readable format
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return "Invalid Date"
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null
  
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

/**
 * Local storage utilities for request plan
 */
export function getRequestPlan(userLogin: string): PlannedRequest[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(`requestPlan_${userLogin}`)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error getting request plan:', error)
    return []
  }
}

export function saveRequestPlan(userLogin: string, plan: PlannedRequest[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(`requestPlan_${userLogin}`, JSON.stringify(plan))
  } catch (error) {
    console.error('Error saving request plan:', error)
  }
}

export function addToRequestPlan(userLogin: string, song: Omit<PlannedRequest, 'id'>): PlannedRequest[] {
  const currentPlan = getRequestPlan(userLogin)
  const newSong: PlannedRequest = {
    ...song,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
  
  const updatedPlan = [newSong, ...currentPlan]
  saveRequestPlan(userLogin, updatedPlan)
  return updatedPlan
}

export function removeFromRequestPlan(userLogin: string, songId: string): PlannedRequest[] {
  const currentPlan = getRequestPlan(userLogin)
  const updatedPlan = currentPlan.filter(song => song.id !== songId)
  saveRequestPlan(userLogin, updatedPlan)
  return updatedPlan
}

/**
 * Spotify icon component as SVG
 */
export function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false
  return extractVideoId(url) !== null
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number): string {
  if (!text) return ''
  return text.length <= length ? text : text.slice(0, length) + '...'
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
