import { EnvConfig } from './types'

/**
 * Environment variable configuration with validation
 */
export const config: EnvConfig = {
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  SOCKET_PORT: parseInt(process.env.SOCKET_PORT || '3002', 10),
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production',
  NEXT_PUBLIC_TWITCH_CLIENT_ID: process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET || '',
  NEXT_PUBLIC_TWITCH_REDIRECT_URI: process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || ''
}

/**
 * Validates required environment variables
 */
export function validateConfig() {
  const required = [
    'YOUTUBE_API_KEY',
    'NEXT_PUBLIC_TWITCH_CLIENT_ID',
    'TWITCH_CLIENT_SECRET',
    'NEXT_PUBLIC_TWITCH_REDIRECT_URI'
  ]
  const missing = required.filter(key => !config[key as keyof EnvConfig])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Application constants
 */
export const constants = {
  SOCKET_RECONNECT_ATTEMPTS: 5,
  SOCKET_RECONNECT_DELAY: 1000,
  MAX_SONG_DURATION_MINUTES: 5,
  HISTORY_PAGE_SIZE: 20,
  YOUTUBE_API_BASE_URL: 'https://www.googleapis.com/youtube/v3',
} as const

/**
 * Socket event configuration
 */
export const socketEvents = {
  QUEUE_UPDATE: 'queueUpdate',
  NEW_SONG_REQUEST: 'newSongRequest',
  ACTIVE_SONG_UPDATE: 'activeSongUpdate',
  DELETE_MY_REQUEST: 'deleteMyRequest',
  EDIT_MY_SONG_SPOTIFY: 'editMySongSpotify',
  EDIT_MY_SONG_YOUTUBE: 'editMySongYouTube',
  EDIT_SPOTIFY_SUCCESS: 'editSpotifySuccess',
  EDIT_SPOTIFY_ERROR: 'editSpotifyError',
  EDIT_YOUTUBE_SUCCESS: 'editYouTubeSuccess',
  EDIT_YOUTUBE_ERROR: 'editYouTubeError',
  ALL_TIME_STATS_UPDATE: 'allTimeStatsUpdate',
  GET_ALL_TIME_STATS: 'getAllTimeStats',
} as const
