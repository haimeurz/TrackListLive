# TrackList Live - Twitch Song Request System

A complete, real-time song request system for Twitch streamers with refund functionality, admin dashboard, and professional queue management.

## 🎵 Features

### Core Functionality
- **Real-time song requests** via Twitch donations and channel points
- **Priority queue system** (donations get priority over channel points)
- **YouTube integration** with video validation and metadata
- **Automatic duration limits** (configurable per request type)
- **Blacklist system** for songs and artists
- **User blocking** for moderation

### Refund System ⭐ NEW!
- **Easy refund process** for high-volume streams
- **Refund from queue** before songs play
- **Refund from history** after songs complete
- **Custom refund reasons** with timestamps
- **Automatic chat notifications** when refunds are processed
- **Refund history tracking** for accountability

### Admin Features
- **Admin dashboard** with authentication
- **Queue management** (delete, skip, mark finished)
- **Real-time statistics** and analytics
- **Content moderation** tools
- **Refund management** interface

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Configure your API keys in .env

# 4. Start the application
npm run dev
```

- **Public Queue**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin

## 🔧 How Streamers Use This

### Daily Workflow
1. **Start stream** → Start TrackList Live server
2. **Open admin dashboard** on second monitor
3. **Tell viewers** how to request songs (donations or channel points)
4. **Monitor queue** while streaming
5. **Play songs** from queue, marking as finished when done
6. **Refund problematic requests** with reasons
7. **End stream** → System saves everything to database

### Refund System (High Volume Streams)
When you get overwhelmed with requests:
1. Click "Refund" button next to any queued song
2. Enter reason: *"High volume, refunding older requests"*
3. System removes from queue and notifies viewer in chat
4. Track all refunds in admin dashboard

## �️ For Viewers

### Donation Requests (Priority)
- Donate through StreamElements
- Include YouTube link: *"$5 for this banger! https://youtube.com/watch?v=..."*
- Gets **priority placement** in queue
- Chat notification confirms addition

### Channel Point Requests
- Redeem "Song Request" with channel points
- Enter YouTube link in redemption text
- Added to **end of queue** (after donations)
- One request per viewer at a time

## 🔧 Configuration Required

Edit `.env` file:

```bash
# YouTube API (for video validation)
YOUTUBE_API_KEY=your_youtube_api_key_here

# Twitch Bot (for chat notifications)
TWITCH_BOT_USERNAME=your_bot_username
TWITCH_BOT_OAUTH_TOKEN=oauth:your_bot_oauth_token
TWITCH_CHANNEL_NAME=your_channel_name

# StreamElements (for donations/channel points)
STREAMELEMENTS_JWT_TOKEN=your_streamelements_jwt_token
STREAMELEMENTS_ACCOUNT_ID=your_streamelements_account_id

# Admin Access
ADMIN_USERNAMES=your_twitch_username,mod_username
```

## 📊 What Makes This Special

- **Professional grade** - handles hundreds of requests
- **Real-time updates** - everything syncs instantly
- **Easy refunds** - perfect for high-volume streams
- **Full automation** - no manual work required
- **Complete moderation** - blacklists, user blocking, duration limits
- **Transparent tracking** - full audit trail of all actions

**Built specifically for Twitch streamers who want professional song request management with easy refund capabilities for busy streams! 🎵**
