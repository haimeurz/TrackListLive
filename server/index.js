const { createServer } = require('http')
const { Server } = require('socket.io')
const chalk = require('chalk')
const path = require('path')
const db = require('./database')
const { 
  formatDurationFromSeconds,
  extractVideoId,
  analyzeRequestText,
  checkBlacklist,
  validateDuration
} = require('./helpers')
const { fetchYouTubeDetails } = require('./youtube')
const { 
  initTwitchChat, 
  sendChatMessage, 
  getTwitchUser,
  disconnectFromTwitch
} = require('./twitch')
const { connectToStreamElements, disconnectFromStreamElements } = require('./streamElements')
require('dotenv').config()

// Configuration
const SOCKET_PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT, 10) : 3002
const httpServer = createServer()
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tracklistlive.db')

// Determine allowed origins from environment variable
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001"
const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim())
console.log(chalk.blue(`[Config] Allowed CORS Origins: ${allowedOrigins.join(', ')}`))

// Add production domain if configured
const productionDomain = process.env.NEXT_PUBLIC_APP_URL 
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin 
  : null
  
if (productionDomain) {
  console.log(chalk.blue(`[Config] Adding production domain to allowed origins: ${productionDomain}`))
  allowedOrigins.push(productionDomain)
}

// Duration limits configuration
const MAX_DONATION_DURATION_SECONDS = parseInt(process.env.MAX_DONATION_DURATION_SECONDS || '600', 10) // Default 10 minutes
const MAX_CHANNEL_POINT_DURATION_SECONDS = parseInt(process.env.MAX_CHANNEL_POINT_DURATION_SECONDS || '300', 10) // Default 5 minutes
console.log(chalk.blue(`[Config] Max Donation Duration: ${MAX_DONATION_DURATION_SECONDS}s`))
console.log(chalk.blue(`[Config] Max Channel Point Duration: ${MAX_CHANNEL_POINT_DURATION_SECONDS}s`))

// Twitch Chat Bot Configuration
const TWITCH_BOT_USERNAME = process.env.TWITCH_BOT_USERNAME
const TWITCH_BOT_OAUTH_TOKEN = process.env.TWITCH_BOT_OAUTH_TOKEN
const TWITCH_CHANNEL_NAME = process.env.TWITCH_CHANNEL_NAME

// StreamElements Configuration
const SE_JWT_TOKEN = process.env.STREAMELEMENTS_JWT_TOKEN
const SE_ACCOUNT_ID = process.env.STREAMELEMENTS_ACCOUNT_ID
const TARGET_REWARD_TITLE = process.env.TARGET_REWARD_TITLE

// Admin Configuration
const ADMIN_USERNAMES_LOWER = (process.env.ADMIN_USERNAMES || '')
  .split(',')
  .map(name => name.trim().toLowerCase())
  .filter(name => name)
console.log(chalk.blue(`[Config] Admin Usernames: ${ADMIN_USERNAMES_LOWER.join(', ')}`))

// Initialize database
db.initDatabase(dbPath)

// Server state
const state = {
  queue: [],
  history: [],
  activeSong: null,
  settings: {},
  blacklist: [],
  blockedUsers: []
}

// Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowUpgrades: true,
})

// Initialize Twitch chat client
let tmiClient = null
if (TWITCH_BOT_USERNAME && TWITCH_BOT_OAUTH_TOKEN && TWITCH_CHANNEL_NAME) {
  tmiClient = initTwitchChat({
    TWITCH_BOT_USERNAME,
    TWITCH_BOT_OAUTH_TOKEN,
    TWITCH_CHANNEL_NAME
  })
} else {
  console.warn(chalk.yellow('Twitch bot credentials missing. Chat features disabled.'))
}

// Authenticated admin sockets
const authenticatedAdminSockets = new Set()

// Helper function to require admin authentication
function requireAdmin(handler) {
  return function(data) {
    if (authenticatedAdminSockets.has(this.id)) {
      return handler.call(this, data)
    } else {
      console.warn(chalk.yellow(`[Security] Unauthorized admin action attempted by socket ${this.id}`))
      this.emit('adminAuthRequired')
    }
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(chalk.green(`[Socket.IO] Client connected: ${socket.id}`))

  // Send initial state
  socket.emit('queueUpdate', state.queue)
  socket.emit('activeSongUpdate', state.activeSong)
  socket.emit('settingsUpdate', state.settings)
  socket.emit('blacklistUpdate', state.blacklist)
  socket.emit('blockedUsersUpdate', state.blockedUsers)

  // Admin authentication
  socket.on('adminAuth', (credentials) => {
    const { username, password } = credentials || {}
    
    // Simple admin check - in production, use proper authentication
    if (username && ADMIN_USERNAMES_LOWER.includes(username.toLowerCase())) {
      authenticatedAdminSockets.add(socket.id)
      socket.emit('adminAuthSuccess')
      console.log(chalk.cyan(`[Admin] Socket ${socket.id} authenticated as ${username}`))
    } else {
      socket.emit('adminAuthFailed', { message: 'Invalid credentials' })
      console.warn(chalk.yellow(`[Security] Failed admin auth attempt: ${username}`))
    }
  })

  // Handle song request from web interface
  socket.on('requestSong', async (requestData) => {
    try {
      const { youtubeUrl, requester, requestType = 'manual' } = requestData
      
      if (!youtubeUrl || !requester) {
        socket.emit('requestError', { message: 'Missing required fields' })
        return
      }

      // Create request object
      const request = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        youtubeUrl,
        requester,
        requestType,
        timestamp: new Date().toISOString()
      }

      // Validate and add song
      await validateAndAddSong(request)
      
    } catch (error) {
      console.error(chalk.red('[Socket.IO] Error processing song request:'), error)
      socket.emit('requestError', { message: 'Failed to process request' })
    }
  })

  // Admin: Delete song from queue
  socket.on('adminDeleteSong', requireAdmin((data) => {
    const { requestId } = data
    const songIndex = state.queue.findIndex(song => song.id === requestId)
    
    if (songIndex !== -1) {
      const removedSong = state.queue.splice(songIndex, 1)[0]
      db.removeSongFromDbQueue(requestId)
      
      io.emit('queueUpdate', state.queue)
      console.log(chalk.magenta(`[Admin] Removed song "${removedSong.title}" from queue`))
    }
  }))

  // Admin: Mark song as finished
  socket.on('adminMarkFinished', requireAdmin(() => {
    if (state.activeSong) {
      const finishedSong = { ...state.activeSong, status: 'completed' }
      
      // Move to history
      db.addSongToHistory(finishedSong)
      state.history.unshift(finishedSong)
      
      // Clear active song
      state.activeSong = null
      db.clearActiveSong()
      
      // Start next song if available
      if (state.queue.length > 0) {
        const nextSong = state.queue.shift()
        state.activeSong = nextSong
        db.removeSongFromDbQueue(nextSong.id)
        db.saveActiveSong(nextSong)
      }
      
      io.emit('activeSongUpdate', state.activeSong)
      io.emit('queueUpdate', state.queue)
      io.emit('historyUpdate', state.history.slice(0, 20))
      
      console.log(chalk.magenta(`[Admin] Marked song as finished`))
    }
  }))

  // Admin: Skip current song
  socket.on('adminSkipSong', requireAdmin(() => {
    if (state.activeSong) {
      const skippedSong = { ...state.activeSong, status: 'skipped' }
      
      // Move to history
      db.addSongToHistory(skippedSong)
      state.history.unshift(skippedSong)
      
      // Clear active song
      state.activeSong = null
      db.clearActiveSong()
      
      // Start next song if available
      if (state.queue.length > 0) {
        const nextSong = state.queue.shift()
        state.activeSong = nextSong
        db.removeSongFromDbQueue(nextSong.id)
        db.saveActiveSong(nextSong)
      }
      
      io.emit('activeSongUpdate', state.activeSong)
      io.emit('queueUpdate', state.queue)
      io.emit('historyUpdate', state.history.slice(0, 20))
      
      console.log(chalk.magenta(`[Admin] Skipped song`))
    }
  }))

  // Get all-time statistics
  socket.on('getAllTimeStats', () => {
    try {
      const stats = db.fetchAllTimeStats()
      socket.emit('allTimeStatsUpdate', stats)
    } catch (error) {
      console.error(chalk.red('[Statistics] Failed to get all-time statistics:'), error)
      socket.emit('allTimeStatsError', { message: 'Failed to fetch statistics data' })
    }
  })

  // Admin: Refund song request from queue
  socket.on('adminRefundQueueSong', requireAdmin((data) => {
    const { requestId, reason = 'Refunded by admin' } = data
    
    try {
      // Find the song in the queue
      const songIndex = state.queue.findIndex(song => song.id === requestId)
      
      if (songIndex !== -1) {
        const song = state.queue[songIndex]
        
        // Mark as refunded in database
        const success = db.refundQueueItem(requestId, reason)
        
        if (success) {
          // Remove from queue
          state.queue.splice(songIndex, 1)
          
          // Send Twitch chat notification if possible
          if (sendChatMessage && song.requesterLogin) {
            const donationText = song.donationInfo 
              ? ` (${song.donationInfo.amount} ${song.donationInfo.currency} donation)`
              : ''
            sendChatMessage(`@${song.requesterLogin}, your song request "${song.title}" has been refunded${donationText}. Reason: ${reason}`)
          }
          
          io.emit('queueUpdate', state.queue)
          socket.emit('refundSuccess', { 
            message: `Successfully refunded "${song.title}" by ${song.requester}`,
            refundedSong: { ...song, refunded: true, refundReason: reason }
          })
          
          console.log(chalk.magenta(`[Admin] Refunded queue song "${song.title}" by ${song.requester}. Reason: ${reason}`))
        } else {
          socket.emit('refundError', { message: 'Failed to refund song in database' })
        }
      } else {
        socket.emit('refundError', { message: 'Song not found in queue' })
      }
    } catch (error) {
      console.error(chalk.red('[Admin] Error refunding queue song:'), error)
      socket.emit('refundError', { message: 'Internal error during refund' })
    }
  }))

  // Admin: Refund song request from history
  socket.on('adminRefundHistorySong', requireAdmin((data) => {
    const { historyId, reason = 'Refunded by admin' } = data
    
    try {
      // Find the song in history
      const song = state.history.find(song => song.id === historyId)
      
      if (song) {
        // Mark as refunded in database
        const success = db.refundHistoryItem(historyId, reason)
        
        if (success) {
          // Update the song in history state
          const songIndex = state.history.findIndex(s => s.id === historyId)
          if (songIndex !== -1) {
            state.history[songIndex] = { 
              ...state.history[songIndex], 
              refunded: true, 
              refundReason: reason,
              refundedAt: new Date().toISOString()
            }
          }
          
          // Send Twitch chat notification if possible
          if (sendChatMessage && song.requesterLogin) {
            const donationText = song.donationInfo 
              ? ` (${song.donationInfo.amount} ${song.donationInfo.currency} donation)`
              : ''
            sendChatMessage(`@${song.requesterLogin}, your song request "${song.title}" has been refunded${donationText}. Reason: ${reason}`)
          }
          
          io.emit('historyUpdate', state.history.slice(0, 20))
          socket.emit('refundSuccess', { 
            message: `Successfully refunded "${song.title}" by ${song.requester}`,
            refundedSong: { ...song, refunded: true, refundReason: reason }
          })
          
          console.log(chalk.magenta(`[Admin] Refunded history song "${song.title}" by ${song.requester}. Reason: ${reason}`))
        } else {
          socket.emit('refundError', { message: 'Failed to refund song in database' })
        }
      } else {
        socket.emit('refundError', { message: 'Song not found in history' })
      }
    } catch (error) {
      console.error(chalk.red('[Admin] Error refunding history song:'), error)
      socket.emit('refundError', { message: 'Internal error during refund' })
    }
  }))

  // Admin: Get refunded requests
  socket.on('getRefundedRequests', requireAdmin(() => {
    try {
      const refundedRequests = db.getRefundedRequests()
      socket.emit('refundedRequestsUpdate', refundedRequests)
    } catch (error) {
      console.error(chalk.red('[Admin] Error fetching refunded requests:'), error)
      socket.emit('refundedRequestsError', { message: 'Failed to fetch refunded requests' })
    }
  }))

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(chalk.yellow(`[Socket.IO] Client disconnected: ${socket.id}`))
    authenticatedAdminSockets.delete(socket.id)
  })
})

// Centralized function to validate and add song requests
async function validateAndAddSong(request, bypassRestrictions = false) {
  const { youtubeUrl, requester, requestType } = request
  const userName = requester

  console.log(chalk.blue(`[Queue] Processing request from ${userName}: ${youtubeUrl}`))

  // Check if requester is blocked
  if (!bypassRestrictions && state.blockedUsers.some(user => user.username.toLowerCase() === userName.toLowerCase())) {
    console.log(chalk.yellow(`[Queue] User ${userName} is blocked - rejecting request`))
    if (sendChatMessage) {
      sendChatMessage(`@${userName}, you are currently blocked from making song requests.`)
    }
    return
  }

  // Check user queue limit for channel points
  if (!bypassRestrictions && requestType === 'channelPoint') {
    const existingRequest = state.queue.find(song => 
      song.requesterLogin?.toLowerCase() === userName.toLowerCase() || 
      song.requester.toLowerCase() === userName.toLowerCase()
    )
    if (existingRequest) {
      console.log(chalk.yellow(`[Queue] User ${userName} already has a song in the queue - rejecting channel point request`))
      if (sendChatMessage) {
        sendChatMessage(`@${userName}, you already have a song in the queue. Please wait for it to play.`)
      }
      return
    }
  }

  // Fetch YouTube details
  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) {
    console.error(chalk.red(`[YouTube] Failed to extract video ID from URL: ${youtubeUrl}`))
    if (sendChatMessage) {
      sendChatMessage(`@${userName}, couldn't process the YouTube link. Please make sure it's a valid video URL.`)
    }
    return
  }

  const videoDetails = await fetchYouTubeDetails(videoId)
  if (!videoDetails) {
    if (sendChatMessage) {
      sendChatMessage(`@${userName}, couldn't fetch details for that YouTube video.`)
    }
    return
  }

  // Validate duration
  const durationError = validateDuration(
    videoDetails.durationSeconds,
    requestType,
    MAX_DONATION_DURATION_SECONDS,
    MAX_CHANNEL_POINT_DURATION_SECONDS
  )
  
  if (!bypassRestrictions && durationError) {
    console.log(chalk.yellow(`[Queue] Request duration (${videoDetails.durationSeconds}s) for "${videoDetails.title}" exceeds limit (${durationError.limit}s) for type ${requestType} - rejecting`))
    if (sendChatMessage) {
      sendChatMessage(`@${userName} ${durationError.message}`)
    }
    return
  }

  // Check blacklist
  const blacklistMatch = checkBlacklist(videoDetails.title, videoDetails.channelTitle, state.blacklist)
  if (!bypassRestrictions && blacklistMatch) {
    console.log(chalk.yellow(`[Blacklist] Item matching term "${blacklistMatch.term}" (type: ${blacklistMatch.type}) found for "${videoDetails.title}" by ${videoDetails.channelTitle} - rejecting`))
    if (sendChatMessage) {
      let blacklistMessage = `@${userName}, sorry, your request for "${videoDetails.title}"`
      if (blacklistMatch.type === 'artist') {
        blacklistMessage += ` by "${videoDetails.channelTitle}"`
      }
      blacklistMessage += ` is currently blacklisted.`
      sendChatMessage(blacklistMessage)
    }
    return
  }

  // Fetch requester info
  let requesterInfo = {}
  try {
    requesterInfo = await getTwitchUser(userName)
  } catch (error) {
    console.warn(chalk.yellow(`[Twitch] Failed to fetch user info for ${userName}: ${error.message}`))
  }

  // Create final song request object
  const finalSongRequest = {
    id: request.id || Date.now().toString(),
    youtubeUrl,
    youtubeId: videoId,
    title: videoDetails.title,
    artist: videoDetails.channelTitle,
    channelId: videoDetails.channelId,
    durationSeconds: videoDetails.durationSeconds,
    thumbnailUrl: videoDetails.thumbnailUrl,
    requester: requesterInfo?.display_name || userName,
    requesterLogin: requesterInfo?.login || userName.toLowerCase(),
    requesterAvatar: requesterInfo?.profile_image_url || null,
    requestType,
    donationInfo: request.donationInfo,
    timestamp: request.timestamp || new Date().toISOString(),
    addedAt: new Date().toISOString(),
    spotifyData: null
  }

  // Add to queue
  const position = addSongToQueue(finalSongRequest)
  const queuePosition = position + 1

  // Emit updates
  io.emit('newSongRequest', finalSongRequest)
  io.emit('queueUpdate', state.queue)

  const requestSource = requestType === 'donation' ? `donation (${request.donationInfo?.amount} ${request.donationInfo?.currency})` : requestType
  console.log(chalk.green(`[Queue] Added song "${finalSongRequest.title}" by ${finalSongRequest.artist}. Type: ${requestType}. Requester: ${userName}. Position: #${queuePosition}. Source: ${requestSource}`))

  if (sendChatMessage) {
    let successMessage = `@${userName} `
    if (requestType === 'donation') {
      successMessage += `Thanks for the ${request.donationInfo?.amount} ${request.donationInfo?.currency} donation! Your priority request for "${finalSongRequest.title}" by ${finalSongRequest.artist} is #${queuePosition} in the queue.`
    } else {
      successMessage += `Your request for "${finalSongRequest.title}" by ${finalSongRequest.artist} is #${queuePosition} in the queue.`
    }
    sendChatMessage(successMessage)
  }
}

// Function to add a song to the queue
function addSongToQueue(song) {
  if (!song) {
    console.warn(chalk.yellow('[Queue] Attempted to add null/undefined song to queue'))
    return -1
  }
  
  try {
    // Determine position based on priority (donations before channel points)
    let insertIndex = 0
    
    if (song.requestType === 'donation') {
      // Find the last donation entry in the queue (donations at the top)
      const lastDonationIndex = state.queue.findIndex(s => s.requestType !== 'donation')
      insertIndex = lastDonationIndex === -1 ? state.queue.length : lastDonationIndex
    } else {
      // For channel points, add to the end
      insertIndex = state.queue.length
    }
    
    // Insert the song at the calculated position
    state.queue.splice(insertIndex, 0, song)
    
    // Add to database
    db.addSongToDbQueue(song)
    
    console.log(chalk.blue(`[Queue] Song added at position ${insertIndex + 1}/${state.queue.length}`))
    return insertIndex
    
  } catch (error) {
    console.error(chalk.red('[Queue] Error adding song to queue:'), error)
    return -1
  }
}

// Load initial data from database
async function loadInitialData() {
  try {
    console.log(chalk.blue('[Database] Loading initial data...'))
    
    // Load queue
    state.queue = db.loadQueueFromDb()
    console.log(chalk.blue(`[Database] Loaded ${state.queue.length} songs from queue`))
    
    // Load active song
    state.activeSong = db.loadActiveSongFromDb()
    if (state.activeSong) {
      console.log(chalk.blue(`[Database] Loaded active song: "${state.activeSong.title}"`))
    }
    
    // Load settings
    state.settings = db.loadSettings()
    console.log(chalk.blue(`[Database] Loaded settings`))
    
    // Load blacklist
    state.blacklist = db.loadBlacklist()
    console.log(chalk.blue(`[Database] Loaded ${state.blacklist.length} blacklist items`))
    
    // Load blocked users
    state.blockedUsers = db.loadBlockedUsers()
    console.log(chalk.blue(`[Database] Loaded ${state.blockedUsers.length} blocked users`))
    
    console.log(chalk.green('[Database] Initial data loaded successfully'))
  } catch (error) {
    console.error(chalk.red('[Database] Error loading initial data:'), error)
  }
}

// Start the server
async function startServer() {
  try {
    await loadInitialData()
    
    // Start HTTP server
    httpServer.listen(SOCKET_PORT, () => {
      console.log(chalk.green(`[Server] Socket.IO server listening on port ${SOCKET_PORT}`))
    })
    
    // Connect to StreamElements if configured
    if (SE_JWT_TOKEN && SE_ACCOUNT_ID) {
      connectToStreamElements(
        { SE_JWT_TOKEN, SE_ACCOUNT_ID },
        handleDonation,
        handleChannelPointRedemption
      )
    } else {
      console.warn(chalk.yellow('StreamElements configuration missing. Donation/channel point features disabled.'))
    }
    
    console.log(chalk.green('[Server] TrackList Live server started successfully!'))
    
  } catch (error) {
    console.error(chalk.red('[Server] Failed to start server:'), error)
    process.exit(1)
  }
}

// Handle donation from StreamElements
async function handleDonation(donationData) {
  try {
    const { username, amount, currency, message } = donationData
    console.log(chalk.magenta(`[StreamElements] Processing donation: ${username} - ${amount} ${currency} - Msg: "${message}"`))
    
    // Analyze message for song request
    const analysisResult = analyzeRequestText(message)
    
    if (analysisResult.type === 'none') {
      console.warn(chalk.yellow(`[StreamElements] No song request found in donation from ${username}: "${message}"`))
      if (sendChatMessage) {
        sendChatMessage(`Thanks @${username} for the ${amount} ${currency}! If you want to request a song with your donation next time, put a YouTube link in the message.`)
      }
      return
    }
    
    // Create initial request data
    const initialRequestData = {
      id: donationData.id || Date.now().toString(),
      requester: username,
      timestamp: donationData.timestamp || new Date().toISOString(),
      requestType: 'donation',
      donationInfo: { amount, currency },
      message
    }
    
    if (analysisResult.type === 'youtube') {
      // Process YouTube URL
      await validateAndAddSong({
        ...initialRequestData,
        youtubeUrl: analysisResult.value
      })
    }
    
  } catch (error) {
    console.error(chalk.red('[StreamElements] Error processing donation:'), error)
  }
}

// Handle channel point redemption from StreamElements
async function handleChannelPointRedemption(redemptionData) {
  try {
    const { username, message } = redemptionData
    console.log(chalk.magenta(`[StreamElements] Processing channel point redemption: ${username} - Input: "${message}"`))
    
    // Analyze message for song request
    const analysisResult = analyzeRequestText(message)
    
    if (analysisResult.type === 'none') {
      console.warn(chalk.yellow(`[StreamElements] No YouTube URL found in redemption from ${username}: "${message}"`))
      if (sendChatMessage) {
        sendChatMessage(`@${username}, please provide a YouTube link with your song request.`)
      }
      return
    }
    
    // Create initial request data
    const initialRequestData = {
      id: redemptionData.id || Date.now().toString(),
      requester: username,
      timestamp: redemptionData.timestamp || new Date().toISOString(),
      requestType: 'channelPoint',
      message
    }
    
    if (analysisResult.type === 'youtube') {
      // Process YouTube URL
      await validateAndAddSong({
        ...initialRequestData,
        youtubeUrl: analysisResult.value
      })
    }
    
  } catch (error) {
    console.error(chalk.red('[StreamElements] Error processing channel point redemption:'), error)
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n[Server] Shutting down gracefully...'))
  
  if (tmiClient) {
    disconnectFromTwitch()
  }
  
  disconnectFromStreamElements()
  
  if (db.getDb()) {
    db.getDb().close()
    console.log(chalk.blue('[Database] Database connection closed'))
  }
  
  process.exit(0)
})

// Start the server
startServer()
