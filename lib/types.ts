/**
 * Configuration types for environment variables
 */
export interface EnvConfig {
  YOUTUBE_API_KEY: string
  SOCKET_PORT: number
  NODE_ENV: 'development' | 'production'
  NEXT_PUBLIC_TWITCH_CLIENT_ID: string
  TWITCH_CLIENT_SECRET: string
  NEXT_PUBLIC_TWITCH_REDIRECT_URI: string
}

/**
 * Represents a song request in the queue or history
 */
export interface SongRequest {
  id: string
  youtubeUrl?: string | null
  requester: string
  requesterLogin?: string
  requesterAvatar?: string | null
  timestamp: string
  title: string
  artist: string
  channelId?: string | null
  duration?: string
  durationSeconds: number
  thumbnailUrl?: string | null
  source: 'youtube' | 'spotify_search' | 'database' | 'database_history' | 'database_active' | string
  requestType: 'channelPoint' | 'donation' | 'manual' | 'history_requeue' | 'socket' | string
  donationInfo?: {
    amount: number
    currency: string
  }
  channelPointReward?: {
    title: string
  }
  status?: 'completed' | 'skipped'
  origin?: string
  spotifyData?: SpotifyTrackData | null
  refunded?: boolean
  refundedAt?: string
  refundReason?: string
}

/**
 * Spotify track data structure
 */
export interface SpotifyTrackData {
  id: string
  uri: string
  name: string
  artists: Array<{ name: string }>
  album: {
    images: Array<{ url: string }>
  }
  durationMs: number
  url: string
}

/**
 * Planned request for the request plan feature
 */
export interface PlannedRequest {
  id: string
  title: string
  artist: string
  youtubeUrl?: string
  spotifyData?: SpotifyTrackData | null
  durationSeconds?: number
  channelId?: string | null
  thumbnailUrl?: string | null
}

/**
 * Application state interface
 */
export interface AppState {
  queue: SongRequest[]
  history: SongRequest[]
  activeSong: SongRequest | null
  settings: Settings
  blacklist: BlacklistItem[]
  blockedUsers: BlockedUser[]
  isLoading: boolean
}

/**
 * Queue state for components
 */
export interface QueueState {
  queue: SongRequest[]
  activeSong: SongRequest | null
  isLoading: boolean
}

/**
 * Settings interface
 */
export interface Settings {
  maxDuration?: number
  [key: string]: any
}

/**
 * Blacklist item
 */
export interface BlacklistItem {
  id: number
  pattern: string
  type: 'song' | 'artist' | 'keyword'
  addedAt: string
}

/**
 * Blocked user
 */
export interface BlockedUser {
  id: number
  username: string
  addedAt: string
}

/**
 * All-time statistics
 */
export interface AllTimeStats {
  totalSongsPlayed: number
  totalDonationSongs: number
  totalChannelPointSongs: number
  songsPlayedToday: number
  averageSongDuration: number
  totalDonationAmount: number
  totalDonationCurrency: string
}

/**
 * Socket event names
 */
export const socketEvents = {
  // Queue events
  QUEUE_UPDATE: 'queueUpdate',
  NEW_SONG_REQUEST: 'newSongRequest',
  ACTIVE_SONG_UPDATE: 'activeSongUpdate',
  
  // User actions
  DELETE_MY_REQUEST: 'deleteMyRequest',
  EDIT_MY_SONG_SPOTIFY: 'editMySongSpotify',
  EDIT_MY_SONG_YOUTUBE: 'editMySongYouTube',
  
  // Admin actions
  ADMIN_DELETE_SONG: 'adminDeleteSong',
  ADMIN_MOVE_TO_TOP: 'adminMoveToTop',
  ADMIN_MARK_FINISHED: 'adminMarkFinished',
  ADMIN_SKIP_SONG: 'adminSkipSong',
  ADMIN_UPDATE_SPOTIFY_LINK: 'adminUpdateSpotifyLink',
  ADMIN_UPDATE_YOUTUBE_URL: 'adminUpdateYouTubeUrl',
  
  // Response events
  EDIT_SPOTIFY_SUCCESS: 'editSpotifySuccess',
  EDIT_SPOTIFY_ERROR: 'editSpotifyError',
  EDIT_YOUTUBE_SUCCESS: 'editYouTubeSuccess',
  EDIT_YOUTUBE_ERROR: 'editYouTubeError',
  
  // Statistics
  ALL_TIME_STATS_UPDATE: 'allTimeStatsUpdate',
  GET_ALL_TIME_STATS: 'getAllTimeStats',
  
  // Settings
  SETTINGS_UPDATE: 'settingsUpdate',
  
  // Blacklist/Blocklist
  BLACKLIST_UPDATE: 'blacklistUpdate',
  BLOCKED_USERS_UPDATE: 'blockedUsersUpdate',
  
  // History
  HISTORY_UPDATE: 'historyUpdate',
  RETURN_TO_QUEUE: 'returnToQueue',
} as const

/**
 * Socket events interface for type safety
 */
export interface SocketEvents {
  [socketEvents.QUEUE_UPDATE]: (queue: SongRequest[]) => void
  [socketEvents.NEW_SONG_REQUEST]: (request: SongRequest) => void
  [socketEvents.ACTIVE_SONG_UPDATE]: (song: SongRequest | null) => void
  [socketEvents.ALL_TIME_STATS_UPDATE]: (stats: AllTimeStats) => void
  [socketEvents.SETTINGS_UPDATE]: (settings: Settings) => void
  [socketEvents.BLACKLIST_UPDATE]: (blacklist: BlacklistItem[]) => void
  [socketEvents.BLOCKED_USERS_UPDATE]: (blockedUsers: BlockedUser[]) => void
  [socketEvents.HISTORY_UPDATE]: (history: SongRequest[]) => void
}
