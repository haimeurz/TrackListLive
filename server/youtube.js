const chalk = require('chalk')
require('dotenv').config()

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

/**
 * Fetch YouTube video details using the YouTube Data API
 */
async function fetchYouTubeDetails(videoId) {
  if (!YOUTUBE_API_KEY) {
    console.error(chalk.red('[YouTube] YouTube API key not configured'))
    return null
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails`
    
    const response = await fetch(url)
    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      console.warn(chalk.yellow(`[YouTube] No video found for ID: ${videoId}`))
      return null
    }

    const video = data.items[0]
    const snippet = video.snippet
    const contentDetails = video.contentDetails

    // Parse duration from ISO 8601 format (PT4M13S) to seconds
    const duration = parseISO8601Duration(contentDetails.duration)

    const videoDetails = {
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      channelId: snippet.channelId,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      durationSeconds: duration,
      publishedAt: snippet.publishedAt
    }

    console.log(chalk.blue(`[YouTube] Fetched details for "${videoDetails.title}" by ${videoDetails.channelTitle} (${duration}s)`))
    return videoDetails

  } catch (error) {
    console.error(chalk.red(`[YouTube] Error fetching video details for ${videoId}:`), error)
    return null
  }
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT4M13S = 4 minutes 13 seconds = 253 seconds
 */
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  
  if (!match) {
    console.warn(chalk.yellow(`[YouTube] Failed to parse duration: ${duration}`))
    return 0
  }

  const hours = parseInt(match[1] || 0, 10)
  const minutes = parseInt(match[2] || 0, 10)
  const seconds = parseInt(match[3] || 0, 10)

  return hours * 3600 + minutes * 60 + seconds
}

module.exports = {
  fetchYouTubeDetails,
  parseISO8601Duration
}
