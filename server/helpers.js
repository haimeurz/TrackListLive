/**
 * Helper functions for the TrackList Live application
 */

/**
 * Format duration from seconds to MM:SS format
 */
function formatDurationFromSeconds(seconds) {
  if (!seconds || seconds < 0) return "0:00"
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url) {
  if (!url) return null
  
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

/**
 * Extract YouTube URL from text
 */
function extractYouTubeUrlFromText(text) {
  if (!text) return null
  
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = text.match(regex)
  return match ? match[0] : null
}

/**
 * Extract Spotify URL from text
 */
function extractSpotifyUrlFromText(text) {
  if (!text) return null
  
  const regex = /https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/
  const match = text.match(regex)
  return match ? match[0] : null
}

/**
 * Analyze request text to determine type and extract relevant data
 */
function analyzeRequestText(text) {
  if (!text) return { type: 'none', value: null }
  
  const cleanText = text.trim()
  
  // Check for YouTube URL
  const youtubeUrl = extractYouTubeUrlFromText(cleanText)
  if (youtubeUrl) {
    return { type: 'youtube', value: youtubeUrl }
  }
  
  // Check for Spotify URL
  const spotifyUrl = extractSpotifyUrlFromText(cleanText)
  if (spotifyUrl) {
    return { type: 'spotify', value: spotifyUrl }
  }
  
  // Check for Spotify album URL (should be rejected)
  if (cleanText.includes('open.spotify.com/album/')) {
    return { type: 'spotifyAlbumUrl', value: cleanText }
  }
  
  // If no URL found but has text, treat as text search
  if (cleanText.length > 0) {
    return { type: 'text', value: cleanText }
  }
  
  return { type: 'none', value: null }
}

/**
 * Check if a song matches any blacklist items
 */
function checkBlacklist(title, artist, blacklist) {
  if (!blacklist || blacklist.length === 0) return null
  
  const titleLower = (title || '').toLowerCase()
  const artistLower = (artist || '').toLowerCase()
  
  for (const item of blacklist) {
    const patternLower = item.pattern.toLowerCase()
    
    switch (item.type) {
      case 'song':
        if (titleLower.includes(patternLower)) {
          return { term: item.pattern, type: item.type }
        }
        break
        
      case 'artist':
        if (artistLower.includes(patternLower)) {
          return { term: item.pattern, type: item.type }
        }
        break
        
      case 'keyword':
        if (titleLower.includes(patternLower) || artistLower.includes(patternLower)) {
          return { term: item.pattern, type: item.type }
        }
        break
    }
  }
  
  return null
}

/**
 * Validate song duration based on request type
 */
function validateDuration(durationSeconds, requestType, maxDonationDuration, maxChannelPointDuration) {
  if (!durationSeconds || durationSeconds <= 0) {
    return null // No duration to validate
  }
  
  let maxDuration, limitType
  
  if (requestType === 'donation') {
    maxDuration = maxDonationDuration
    limitType = 'donation'
  } else if (requestType === 'channelPoint') {
    maxDuration = maxChannelPointDuration
    limitType = 'channel point'
  } else {
    return null // Unknown request type, no validation
  }
  
  if (durationSeconds > maxDuration) {
    const maxMinutes = Math.floor(maxDuration / 60)
    const maxSeconds = maxDuration % 60
    const maxDurationStr = maxSeconds > 0 ? `${maxMinutes}:${maxSeconds.toString().padStart(2, '0')}` : `${maxMinutes} minutes`
    
    return {
      limit: maxDuration,
      message: `Sorry, ${limitType} requests are limited to ${maxDurationStr} max.`
    }
  }
  
  return null
}

/**
 * Parse ISO 8601 duration format (PT4M33S) to seconds
 */
function parseIsoDuration(duration) {
  if (!duration) return 0
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  
  const hours = parseInt(match[1]) || 0
  const minutes = parseInt(match[2]) || 0
  const seconds = parseInt(match[3]) || 0
  
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Format duration to human readable format
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0:00"
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
}

/**
 * Sanitize string for safe database/display usage
 */
function sanitizeString(str) {
  if (!str) return ''
  return str.replace(/[<>]/g, '').trim()
}

/**
 * Generate a unique ID
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

/**
 * Check if a URL is a valid YouTube URL
 */
function isValidYouTubeUrl(url) {
  if (!url) return false
  return extractVideoId(url) !== null
}

/**
 * Check if a URL is a valid Spotify track URL
 */
function isValidSpotifyTrackUrl(url) {
  if (!url) return false
  return /https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(url)
}

/**
 * Get YouTube thumbnail URL
 */
function getYouTubeThumbnail(videoId, quality = 'medium') {
  if (!videoId) return null
  
  const qualityMap = {
    'default': 'default',
    'medium': 'mqdefault',
    'high': 'hqdefault',
    'standard': 'sddefault',
    'maxres': 'maxresdefault'
  }
  
  const qualityStr = qualityMap[quality] || 'mqdefault'
  return `https://img.youtube.com/vi/${videoId}/${qualityStr}.jpg`
}

/**
 * Truncate text to specified length
 */
function truncate(text, length) {
  if (!text) return ''
  return text.length <= length ? text : text.slice(0, length) + '...'
}

/**
 * Sleep function for async delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry function with exponential backoff
 */
async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }
  
  throw lastError
}

module.exports = {
  formatDurationFromSeconds,
  extractVideoId,
  extractYouTubeUrlFromText,
  extractSpotifyUrlFromText,
  analyzeRequestText,
  checkBlacklist,
  validateDuration,
  parseIsoDuration,
  formatDuration,
  sanitizeString,
  generateId,
  isValidYouTubeUrl,
  isValidSpotifyTrackUrl,
  getYouTubeThumbnail,
  truncate,
  sleep,
  retry
}
