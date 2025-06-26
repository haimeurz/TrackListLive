const WebSocket = require('ws')
const chalk = require('chalk')

let ws = null
let config = {}
let donationHandler = null
let channelPointHandler = null

/**
 * Connect to StreamElements WebSocket
 */
function connectToStreamElements(seConfig, onDonation, onChannelPoint) {
  config = seConfig
  donationHandler = onDonation
  channelPointHandler = onChannelPoint

  const wsUrl = `wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket&token=${config.SE_JWT_TOKEN}`
  
  ws = new WebSocket(wsUrl)

  ws.on('open', () => {
    console.log(chalk.green('[StreamElements] Connected to WebSocket'))
    
    // Send authentication
    ws.send('40')
    
    // Join account room
    ws.send(`42["subscribe",{"room":"${config.SE_ACCOUNT_ID}"}]`)
  })

  ws.on('message', (data) => {
    try {
      const message = data.toString()
      
      if (message.startsWith('42')) {
        const jsonPart = message.substring(2)
        const parsed = JSON.parse(jsonPart)
        
        if (parsed[0] === 'event') {
          handleStreamElementsEvent(parsed[1])
        }
      }
    } catch (error) {
      console.error(chalk.red('[StreamElements] Error parsing message:'), error)
    }
  })

  ws.on('close', () => {
    console.log(chalk.yellow('[StreamElements] WebSocket connection closed'))
    
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      if (config.SE_JWT_TOKEN) {
        console.log(chalk.blue('[StreamElements] Attempting to reconnect...'))
        connectToStreamElements(config, donationHandler, channelPointHandler)
      }
    }, 5000)
  })

  ws.on('error', (error) => {
    console.error(chalk.red('[StreamElements] WebSocket error:'), error)
  })
}

/**
 * Handle StreamElements events
 */
function handleStreamElementsEvent(event) {
  const { type, data } = event

  console.log(chalk.magenta(`[StreamElements] Received event: ${type}`))

  switch (type) {
    case 'tip':
      handleDonationEvent(data)
      break
    case 'redemption':
      handleChannelPointEvent(data)
      break
    default:
      console.log(chalk.gray(`[StreamElements] Unhandled event type: ${type}`))
  }
}

/**
 * Handle donation events
 */
function handleDonationEvent(data) {
  try {
    const donationData = {
      id: data.tipId || Date.now().toString(),
      username: data.username,
      amount: parseFloat(data.amount),
      currency: data.currency || 'USD',
      message: data.message || '',
      timestamp: new Date().toISOString()
    }

    console.log(chalk.green(`[StreamElements] Donation: ${donationData.username} - ${donationData.amount} ${donationData.currency}`))

    if (donationHandler) {
      donationHandler(donationData)
    }
  } catch (error) {
    console.error(chalk.red('[StreamElements] Error processing donation:'), error)
  }
}

/**
 * Handle channel point redemption events
 */
function handleChannelPointEvent(data) {
  try {
    // Only process if it matches our target reward
    if (process.env.TARGET_REWARD_TITLE && data.rewardTitle !== process.env.TARGET_REWARD_TITLE) {
      console.log(chalk.gray(`[StreamElements] Ignoring redemption for "${data.rewardTitle}" (not target reward)`))
      return
    }

    const redemptionData = {
      id: data.redemptionId || Date.now().toString(),
      username: data.username,
      message: data.input || '',
      rewardTitle: data.rewardTitle,
      timestamp: new Date().toISOString()
    }

    console.log(chalk.green(`[StreamElements] Channel Point Redemption: ${redemptionData.username} - ${redemptionData.rewardTitle}`))

    if (channelPointHandler) {
      channelPointHandler(redemptionData)
    }
  } catch (error) {
    console.error(chalk.red('[StreamElements] Error processing channel point redemption:'), error)
  }
}

/**
 * Disconnect from StreamElements
 */
function disconnectFromStreamElements() {
  if (ws) {
    ws.close()
    console.log(chalk.blue('[StreamElements] Disconnected from WebSocket'))
  }
}

module.exports = {
  connectToStreamElements,
  disconnectFromStreamElements
}
