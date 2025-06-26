const tmi = require('tmi.js')
const chalk = require('chalk')

let client = null
let config = {}

/**
 * Initialize Twitch chat client
 */
function initTwitchChat({ TWITCH_BOT_USERNAME, TWITCH_BOT_OAUTH_TOKEN, TWITCH_CHANNEL_NAME }) {
  config = { TWITCH_BOT_USERNAME, TWITCH_BOT_OAUTH_TOKEN, TWITCH_CHANNEL_NAME }
  
  const opts = {
    identity: {
      username: TWITCH_BOT_USERNAME,
      password: TWITCH_BOT_OAUTH_TOKEN
    },
    channels: [TWITCH_CHANNEL_NAME],
    options: {
      debug: false
    },
    connection: {
      reconnect: true,
      secure: true
    }
  }

  client = new tmi.client(opts)

  // Event handlers
  client.on('message', onMessageHandler)
  client.on('connected', onConnectedHandler)
  client.on('disconnected', onDisconnectedHandler)

  // Connect to Twitch
  client.connect().catch(console.error)

  return client
}

/**
 * Handle chat messages
 */
function onMessageHandler(target, context, msg, self) {
  if (self) return // Ignore echoed messages

  const commandName = msg.trim()
  
  // You can add chat commands here if needed
  // For now, we're primarily using this for sending messages
}

/**
 * Handle successful connection
 */
function onConnectedHandler(addr, port) {
  console.log(chalk.green(`[Twitch] Connected to ${addr}:${port} as ${config.TWITCH_BOT_USERNAME}`))
}

/**
 * Handle disconnection
 */
function onDisconnectedHandler(reason) {
  console.log(chalk.yellow(`[Twitch] Disconnected: ${reason}`))
}

/**
 * Send a message to the configured Twitch channel
 */
function sendChatMessage(message) {
  if (!client || !config.TWITCH_CHANNEL_NAME) {
    console.warn(chalk.yellow('[Twitch] Cannot send message: client not connected'))
    return false
  }

  try {
    client.say(config.TWITCH_CHANNEL_NAME, message)
    console.log(chalk.cyan(`[Twitch] Sent message: ${message}`))
    return true
  } catch (error) {
    console.error(chalk.red('[Twitch] Error sending message:'), error)
    return false
  }
}

/**
 * Get Twitch user information
 */
async function getTwitchUser(username) {
  // This would typically use the Twitch API to get user info
  // For now, return basic info
  return {
    login: username.toLowerCase(),
    display_name: username,
    profile_image_url: null
  }
}

/**
 * Disconnect from Twitch
 */
function disconnectFromTwitch() {
  if (client) {
    client.disconnect()
    console.log(chalk.blue('[Twitch] Disconnected from chat'))
  }
}

module.exports = {
  initTwitchChat,
  sendChatMessage,
  getTwitchUser,
  disconnectFromTwitch
}
