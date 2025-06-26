const chalk = require('chalk')
const path = require('path')
const Database = require('better-sqlite3')
const { formatDurationFromSeconds } = require('./helpers')
const fs = require('fs')

let db = null
let insertHistoryStmt, insertQueueStmt, deleteQueueStmt, clearQueueStmt
let saveSettingStmt, addBlacklistStmt, removeBlacklistStmt, addBlockedUserStmt, removeBlockedUserStmt
let saveActiveSongStmt, clearActiveSongStmt
let refundQueueItemStmt, refundHistoryItemStmt, getRefundedRequestsStmt, updateQueueWithDonationStmt, updateHistoryWithDonationStmt

/**
 * Initializes the SQLite database with required tables
 */
function initDatabase(dbPath) {
  try {
    // Determine the final path for the database file
    const dbFileName = 'tracklistlive.db'
    let finalDbPath
    
    if (process.env.PERSISTENT_DATA_PATH) {
      // Use the persistent volume path directly
      finalDbPath = path.join(process.env.PERSISTENT_DATA_PATH, dbFileName)
    } else if (dbPath) {
      // Use the custom path if provided
      finalDbPath = dbPath
    } else {
      // Default to project's data directory
      finalDbPath = path.join(__dirname, '..', 'data', dbFileName)
    }

    // Ensure directory exists
    const dbDir = path.dirname(finalDbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
      console.log(chalk.yellow(`[Database] Created directory: ${dbDir}`))
    }

    console.log(chalk.blue(`[Database] Initializing database at: ${finalDbPath}`))
    db = new Database(finalDbPath)
    console.log(chalk.blue(`[Database] Connected to SQLite database at ${finalDbPath}`))

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL')

    // Create tables
    createTables()
    
    // Create indexes
    createIndexes()
    
    // Prepare statements
    prepareStatements()

    console.log(chalk.green('[Database] Database initialized successfully'))
    return db

  } catch (err) {
    console.error(chalk.red('[Database] Failed to connect or initialize SQLite database:'), err)
    throw err
  }
}

/**
 * Create database tables
 */
function createTables() {
  // Song history table
  const createHistoryTableStmt = `
    CREATE TABLE IF NOT EXISTS song_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtubeUrl TEXT,
      title TEXT,
      artist TEXT,
      channelId TEXT,
      durationSeconds INTEGER,
      requester TEXT NOT NULL,
      requesterLogin TEXT,
      requesterAvatar TEXT,
      thumbnailUrl TEXT,
      requestType TEXT NOT NULL,
      completedAt TEXT DEFAULT (datetime('now')),
      spotifyData TEXT,
      display_order INTEGER,
      refunded INTEGER DEFAULT 0,
      refundedAt TEXT,
      refundReason TEXT,
      donationAmount REAL,
      donationCurrency TEXT
    );
  `
  db.exec(createHistoryTableStmt)

  // Add refund columns to existing table if they don't exist
  try {
    db.exec('ALTER TABLE song_history ADD COLUMN refunded INTEGER DEFAULT 0')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE song_history ADD COLUMN refundedAt TEXT')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE song_history ADD COLUMN refundReason TEXT')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE song_history ADD COLUMN donationAmount REAL')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE song_history ADD COLUMN donationCurrency TEXT')
  } catch (err) {
    // Column already exists
  }

  // Active song table
  const createActiveSongTableStmt = `
    CREATE TABLE IF NOT EXISTS active_song (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtubeUrl TEXT,
      title TEXT,
      artist TEXT,
      channelId TEXT,
      durationSeconds INTEGER,
      requester TEXT NOT NULL,
      requesterLogin TEXT,
      requesterAvatar TEXT,
      thumbnailUrl TEXT,
      requestType TEXT NOT NULL,
      startedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      spotifyData TEXT
    );
  `
  db.exec(createActiveSongTableStmt)

  // Active queue table
  const createActiveQueueTableStmt = `
    CREATE TABLE IF NOT EXISTS active_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT UNIQUE,
      youtubeUrl TEXT,
      title TEXT,
      artist TEXT,
      channelId TEXT,
      durationSeconds INTEGER,
      requester TEXT NOT NULL,
      requesterLogin TEXT,
      requesterAvatar TEXT,
      thumbnailUrl TEXT,
      requestType TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      spotifyData TEXT,
      refunded INTEGER DEFAULT 0,
      refundedAt TEXT,
      refundReason TEXT,
      donationAmount REAL,
      donationCurrency TEXT
    );
  `
  db.exec(createActiveQueueTableStmt)

  // Add refund columns to existing queue table if they don't exist
  try {
    db.exec('ALTER TABLE active_queue ADD COLUMN refunded INTEGER DEFAULT 0')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE active_queue ADD COLUMN refundedAt TEXT')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE active_queue ADD COLUMN refundReason TEXT')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE active_queue ADD COLUMN donationAmount REAL')
  } catch (err) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE active_queue ADD COLUMN donationCurrency TEXT')
  } catch (err) {
    // Column already exists
  }

  // Settings table
  const createSettingsTableStmt = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `
  db.exec(createSettingsTableStmt)

  // Blacklist table
  const createBlacklistTableStmt = `
    CREATE TABLE IF NOT EXISTS blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `
  db.exec(createBlacklistTableStmt)

  // Blocked users table
  const createBlockedUsersTableStmt = `
    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `
  db.exec(createBlockedUsersTableStmt)
}

/**
 * Create database indexes
 */
function createIndexes() {
  const createHistoryIndexes = `
    CREATE INDEX IF NOT EXISTS idx_requester ON song_history (requester);
    CREATE INDEX IF NOT EXISTS idx_artist ON song_history (artist);
    CREATE INDEX IF NOT EXISTS idx_title ON song_history (title);
    CREATE INDEX IF NOT EXISTS idx_completedAt ON song_history (completedAt);
  `
  db.exec(createHistoryIndexes)

  const createQueueIndexes = `
    CREATE INDEX IF NOT EXISTS idx_queue_order ON active_queue (priority DESC, addedAt ASC);
  `
  db.exec(createQueueIndexes)
}

/**
 * Prepare SQL statements
 */
function prepareStatements() {
  try {
    // History & Queue statements
    insertHistoryStmt = db.prepare(`
      INSERT INTO song_history (
        youtubeUrl, title, artist, channelId, durationSeconds, 
        requester, requesterLogin, requesterAvatar, thumbnailUrl, 
        requestType, completedAt, spotifyData, display_order,
        donationAmount, donationCurrency
      ) VALUES (
        @youtubeUrl, @title, @artist, @channelId, @durationSeconds, 
        @requester, @requesterLogin, @requesterAvatar, @thumbnailUrl, 
        @requestType, @completedAt, @spotifyData, @displayOrder,
        @donationAmount, @donationCurrency
      )
    `)
    
    insertQueueStmt = db.prepare(`
      INSERT INTO active_queue (
        request_id, youtubeUrl, title, artist, channelId, durationSeconds,
        requester, requesterLogin, requesterAvatar, thumbnailUrl, requestType, priority, addedAt, spotifyData,
        donationAmount, donationCurrency
      ) VALUES (
        @request_id, @youtubeUrl, @title, @artist, @channelId, @durationSeconds,
        @requester, @requesterLogin, @requesterAvatar, @thumbnailUrl, @requestType, @priority, @addedAt, @spotifyData,
        @donationAmount, @donationCurrency
      )
    `)
    
    deleteQueueStmt = db.prepare('DELETE FROM active_queue WHERE request_id = ?')
    clearQueueStmt = db.prepare('DELETE FROM active_queue')

    // Settings statements
    saveSettingStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

    // Blacklist statements
    addBlacklistStmt = db.prepare('INSERT INTO blacklist (pattern, type) VALUES (?, ?)')
    removeBlacklistStmt = db.prepare('DELETE FROM blacklist WHERE id = ?')

    // Blocked users statements
    addBlockedUserStmt = db.prepare('INSERT INTO blocked_users (username, addedAt) VALUES (?, ?)')
    removeBlockedUserStmt = db.prepare('DELETE FROM blocked_users WHERE username = ? COLLATE NOCASE')

    // Active song statements
    saveActiveSongStmt = db.prepare(`
      INSERT OR REPLACE INTO active_song (
        id, youtubeUrl, title, artist, channelId, durationSeconds,
        requester, requesterLogin, requesterAvatar, thumbnailUrl, requestType, startedAt, spotifyData
      ) VALUES (
        1, @youtubeUrl, @title, @artist, @channelId, @durationSeconds,
        @requester, @requesterLogin, @requesterAvatar, @thumbnailUrl, @requestType, @startedAt, @spotifyData
      )
    `)
    
    clearActiveSongStmt = db.prepare('DELETE FROM active_song')

    // Refund statements
    refundQueueItemStmt = db.prepare(`
      UPDATE active_queue 
      SET refunded = 1, refundedAt = datetime('now'), refundReason = ?
      WHERE request_id = ?
    `)
    
    refundHistoryItemStmt = db.prepare(`
      UPDATE song_history 
      SET refunded = 1, refundedAt = datetime('now'), refundReason = ?
      WHERE id = ?
    `)
    
    getRefundedRequestsStmt = db.prepare(`
      SELECT * FROM song_history 
      WHERE refunded = 1 
      ORDER BY refundedAt DESC
    `)

    updateQueueWithDonationStmt = db.prepare(`
      UPDATE active_queue 
      SET donationAmount = ?, donationCurrency = ?
      WHERE request_id = ?
    `)

    updateHistoryWithDonationStmt = db.prepare(`
      UPDATE song_history 
      SET donationAmount = ?, donationCurrency = ?
      WHERE id = ?
    `)

    console.log(chalk.blue('[Database] Prepared statements created'))

  } catch (error) {
    console.error(chalk.red('[Database] Error preparing statements:'), error)
    throw error
  }
}

/**
 * Database update functions
 */
function saveSetting(key, value) {
  try {
    saveSettingStmt.run(key, typeof value === 'string' ? value : JSON.stringify(value))
    console.log(chalk.blue(`[Database] Setting saved: ${key} = ${value}`))
  } catch (error) {
    console.error(chalk.red(`[Database] Error saving setting ${key}:`), error)
  }
}

function addSongToDbQueue(song) {
  try {
    const priority = song.requestType === 'donation' ? 1 : 0
    
    insertQueueStmt.run({
      request_id: song.id,
      youtubeUrl: song.youtubeUrl || null,
      title: song.title,
      artist: song.artist,
      channelId: song.channelId || null,
      durationSeconds: song.durationSeconds,
      requester: song.requester,
      requesterLogin: song.requesterLogin || null,
      requesterAvatar: song.requesterAvatar || null,
      thumbnailUrl: song.thumbnailUrl || null,
      requestType: song.requestType,
      priority: priority,
      addedAt: song.addedAt || new Date().toISOString(),
      spotifyData: song.spotifyData ? JSON.stringify(song.spotifyData) : null,
      donationAmount: song.donationInfo?.amount || null,
      donationCurrency: song.donationInfo?.currency || null
    })
    
    console.log(chalk.blue(`[Database] Song added to queue: ${song.title}`))
    
  } catch (error) {
    console.error(chalk.red('[Database] Error adding song to queue:'), error)
  }
}

function removeSongFromDbQueue(requestId) {
  try {
    const result = deleteQueueStmt.run(requestId)
    if (result.changes > 0) {
      console.log(chalk.blue(`[Database] Removed song from queue: ${requestId}`))
    }
  } catch (error) {
    console.error(chalk.red('[Database] Error removing song from queue:'), error)
  }
}

function addSongToHistory(song) {
  try {
    const displayOrder = Date.now()
    
    insertHistoryStmt.run({
      youtubeUrl: song.youtubeUrl || null,
      title: song.title,
      artist: song.artist,
      channelId: song.channelId || null,
      durationSeconds: song.durationSeconds,
      requester: song.requester,
      requesterLogin: song.requesterLogin || null,
      requesterAvatar: song.requesterAvatar || null,
      thumbnailUrl: song.thumbnailUrl || null,
      requestType: song.requestType,
      completedAt: new Date().toISOString(),
      spotifyData: song.spotifyData ? JSON.stringify(song.spotifyData) : null,
      displayOrder: displayOrder,
      donationAmount: song.donationInfo?.amount || null,
      donationCurrency: song.donationInfo?.currency || null
    })
    
    console.log(chalk.blue(`[Database] Song added to history: ${song.title}`))
    
  } catch (error) {
    console.error(chalk.red('[Database] Error adding song to history:'), error)
  }
}

function saveActiveSong(song) {
  try {
    saveActiveSongStmt.run({
      youtubeUrl: song.youtubeUrl || null,
      title: song.title,
      artist: song.artist,
      channelId: song.channelId || null,
      durationSeconds: song.durationSeconds,
      requester: song.requester,
      requesterLogin: song.requesterLogin || null,
      requesterAvatar: song.requesterAvatar || null,
      thumbnailUrl: song.thumbnailUrl || null,
      requestType: song.requestType,
      startedAt: new Date().toISOString(),
      spotifyData: song.spotifyData ? JSON.stringify(song.spotifyData) : null
    })
    
    console.log(chalk.blue(`[Database] Active song saved: ${song.title}`))
    
  } catch (error) {
    console.error(chalk.red('[Database] Error saving active song:'), error)
  }
}

function clearActiveSong() {
  try {
    clearActiveSongStmt.run()
    console.log(chalk.blue('[Database] Active song cleared'))
  } catch (error) {
    console.error(chalk.red('[Database] Error clearing active song:'), error)
  }
}

function addBlacklistItem(pattern, type) {
  try {
    addBlacklistStmt.run(pattern, type)
    console.log(chalk.blue(`[Database] Blacklist item added: ${pattern} (${type})`))
  } catch (error) {
    console.error(chalk.red('[Database] Error adding blacklist item:'), error)
  }
}

function removeBlacklistItem(id) {
  try {
    const result = removeBlacklistStmt.run(id)
    if (result.changes > 0) {
      console.log(chalk.blue(`[Database] Blacklist item removed: ${id}`))
    }
  } catch (error) {
    console.error(chalk.red('[Database] Error removing blacklist item:'), error)
  }
}

function addBlockedUser(username, addedAt) {
  try {
    addBlockedUserStmt.run(username, addedAt)
    console.log(chalk.blue(`[Database] Blocked user added: ${username}`))
  } catch (error) {
    console.error(chalk.red('[Database] Error adding blocked user:'), error)
  }
}

function removeBlockedUser(username) {
  try {
    const result = removeBlockedUserStmt.run(username)
    if (result.changes > 0) {
      console.log(chalk.blue(`[Database] Blocked user removed: ${username}`))
    }
  } catch (error) {
    console.error(chalk.red('[Database] Error removing blocked user:'), error)
  }
}

/**
 * Data loading functions
 */
function loadQueueFromDb() {
  try {
    const stmt = db.prepare('SELECT * FROM active_queue ORDER BY priority DESC, addedAt ASC')
    const rows = stmt.all()
    
    return rows.map(row => ({
      id: row.request_id,
      youtubeUrl: row.youtubeUrl,
      title: row.title,
      artist: row.artist,
      channelId: row.channelId,
      durationSeconds: row.durationSeconds,
      requester: row.requester,
      requesterLogin: row.requesterLogin,
      requesterAvatar: row.requesterAvatar,
      thumbnailUrl: row.thumbnailUrl,
      requestType: row.requestType,
      timestamp: row.addedAt,
      addedAt: row.addedAt,
      spotifyData: row.spotifyData ? JSON.parse(row.spotifyData) : null,
      source: 'database',
      origin: 'database_queue'
    }))
    
  } catch (error) {
    console.error(chalk.red('[Database] Error loading queue:'), error)
    return []
  }
}

function loadActiveSongFromDb() {
  try {
    const stmt = db.prepare('SELECT * FROM active_song LIMIT 1')
    const row = stmt.get()
    
    if (!row) return null
    
    return {
      id: 'active_' + Date.now(),
      youtubeUrl: row.youtubeUrl,
      title: row.title,
      artist: row.artist,
      channelId: row.channelId,
      durationSeconds: row.durationSeconds,
      requester: row.requester,
      requesterLogin: row.requesterLogin,
      requesterAvatar: row.requesterAvatar,
      thumbnailUrl: row.thumbnailUrl,
      requestType: row.requestType,
      timestamp: row.startedAt,
      startedAt: row.startedAt,
      spotifyData: row.spotifyData ? JSON.parse(row.spotifyData) : null,
      source: 'database',
      origin: 'database_active'
    }
    
  } catch (error) {
    console.error(chalk.red('[Database] Error loading active song:'), error)
    return null
  }
}

function loadSettings() {
  try {
    const stmt = db.prepare('SELECT * FROM settings')
    const rows = stmt.all()
    
    const settings = {}
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value)
      } catch {
        settings[row.key] = row.value
      }
    })
    
    return settings
    
  } catch (error) {
    console.error(chalk.red('[Database] Error loading settings:'), error)
    return {}
  }
}

function loadBlacklist() {
  try {
    const stmt = db.prepare('SELECT * FROM blacklist ORDER BY addedAt DESC')
    return stmt.all()
  } catch (error) {
    console.error(chalk.red('[Database] Error loading blacklist:'), error)
    return []
  }
}

function loadBlockedUsers() {
  try {
    const stmt = db.prepare('SELECT * FROM blocked_users ORDER BY addedAt DESC')
    return stmt.all()
  } catch (error) {
    console.error(chalk.red('[Database] Error loading blocked users:'), error)
    return []
  }
}

function fetchAllTimeStats() {
  try {
    // Total songs played
    const totalSongsPlayed = db.prepare('SELECT COUNT(*) as count FROM song_history').get().count
    
    // Donation vs channel point breakdown
    const donationSongs = db.prepare('SELECT COUNT(*) as count FROM song_history WHERE requestType = ?').get('donation').count
    const channelPointSongs = db.prepare('SELECT COUNT(*) as count FROM song_history WHERE requestType = ?').get('channelPoint').count
    
    // Songs played today
    const today = new Date().toISOString().split('T')[0]
    const songsPlayedToday = db.prepare('SELECT COUNT(*) as count FROM song_history WHERE DATE(completedAt) = ?').get(today).count
    
    // Average song duration
    const avgDuration = db.prepare('SELECT AVG(durationSeconds) as avg FROM song_history WHERE durationSeconds IS NOT NULL').get().avg || 0
    
    return {
      totalSongsPlayed,
      totalDonationSongs: donationSongs,
      totalChannelPointSongs: channelPointSongs,
      songsPlayedToday,
      averageSongDuration: Math.round(avgDuration),
      totalDonationAmount: 0, // TODO: Calculate from donation info
      totalDonationCurrency: 'USD'
    }
    
  } catch (error) {
    console.error(chalk.red('[Database] Error fetching statistics:'), error)
    return {
      totalSongsPlayed: 0,
      totalDonationSongs: 0,
      totalChannelPointSongs: 0,
      songsPlayedToday: 0,
      averageSongDuration: 0,
      totalDonationAmount: 0,
      totalDonationCurrency: 'USD'
    }
  }
}

/**
 * Refund functions
 */
function refundQueueItem(requestId, reason = 'Refunded by admin') {
  try {
    const result = refundQueueItemStmt.run(reason, requestId)
    if (result.changes > 0) {
      console.log(chalk.blue(`[Database] Queue item refunded: ${requestId} - ${reason}`))
      return true
    }
    return false
  } catch (error) {
    console.error(chalk.red('[Database] Error refunding queue item:'), error)
    return false
  }
}

function refundHistoryItem(historyId, reason = 'Refunded by admin') {
  try {
    const result = refundHistoryItemStmt.run(reason, historyId)
    if (result.changes > 0) {
      console.log(chalk.blue(`[Database] History item refunded: ${historyId} - ${reason}`))
      return true
    }
    return false
  } catch (error) {
    console.error(chalk.red('[Database] Error refunding history item:'), error)
    return false
  }
}

function getRefundedRequests() {
  try {
    const stmt = db.prepare(`
      SELECT 
        id, title, artist, requester, refundedAt, refundReason, 
        donationAmount, donationCurrency, requestType, completedAt
      FROM song_history 
      WHERE refunded = 1 
      ORDER BY refundedAt DESC
    `)
    return stmt.all()
  } catch (error) {
    console.error(chalk.red('[Database] Error fetching refunded requests:'), error)
    return []
  }
}

function updateQueueWithDonation(requestId, amount, currency) {
  try {
    const result = updateQueueWithDonationStmt.run(amount, currency, requestId)
    if (result.changes > 0) {
      console.log(chalk.blue(`[Database] Queue item updated with donation: ${requestId} - ${amount} ${currency}`))
      return true
    }
    return false
  } catch (error) {
    console.error(chalk.red('[Database] Error updating queue item with donation:'), error)
    return false
  }
}

function updateHistoryWithDonation(historyId, amount, currency) {
  try {
    const result = updateHistoryWithDonationStmt.run(amount, currency, historyId)
    if (result.changes > 0) {
      console.log(chalk.blue(`[Database] History item updated with donation: ${historyId} - ${amount} ${currency}`))
      return true
    }
    return false
  } catch (error) {
    console.error(chalk.red('[Database] Error updating history item with donation:'), error)
    return false
  }
}

/**
 * Get database instance
 */
function getDb() {
  return db
}

module.exports = {
  initDatabase,
  saveSetting,
  addSongToDbQueue,
  removeSongFromDbQueue,
  addSongToHistory,
  saveActiveSong,
  clearActiveSong,
  addBlacklistItem,
  removeBlacklistItem,
  addBlockedUser,
  removeBlockedUser,
  loadQueueFromDb,
  loadActiveSongFromDb,
  loadSettings,
  loadBlacklist,
  loadBlockedUsers,
  fetchAllTimeStats,
  refundQueueItem,
  refundHistoryItem,
  getRefundedRequests,
  updateQueueWithDonation,
  updateHistoryWithDonation,
  getDb
}
