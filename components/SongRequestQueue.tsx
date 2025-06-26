"use client"

import { useState, useEffect } from "react"
import { Socket } from "socket.io-client"
import { SongRequest, QueueState } from "@/lib/types"
import { formatDuration, formatTimestamp } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SongRequestQueueProps {
  socket: Socket | null
  isConnected: boolean
  initialState: QueueState
  isAdmin?: boolean
}

export default function SongRequestQueue({ socket, isConnected, initialState, isAdmin = false }: SongRequestQueueProps) {
  const [queueState, setQueueState] = useState<QueueState>(initialState)
  const [searchTerm, setSearchTerm] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [showRefundModal, setShowRefundModal] = useState(false)

  useEffect(() => {
    setQueueState(initialState)
  }, [initialState])

  useEffect(() => {
    if (!socket) return

    const handleQueueUpdate = (queue: SongRequest[]) => {
      setQueueState(prev => ({ ...prev, queue }))
    }

    const handleActiveSongUpdate = (activeSong: SongRequest | null) => {
      setQueueState(prev => ({ ...prev, activeSong }))
    }

    const handleRefundSuccess = (data: { message: string }) => {
      console.log('Refund success:', data.message)
      setShowRefundModal(false)
      setRefundingId(null)
      setRefundReason("")
    }

    const handleRefundError = (data: { message: string }) => {
      console.error('Refund error:', data.message)
      alert(`Refund failed: ${data.message}`)
      setRefundingId(null)
    }

    socket.on('queueUpdate', handleQueueUpdate)
    socket.on('activeSongUpdate', handleActiveSongUpdate)
    socket.on('refundSuccess', handleRefundSuccess)
    socket.on('refundError', handleRefundError)

    return () => {
      socket.off('queueUpdate', handleQueueUpdate)
      socket.off('activeSongUpdate', handleActiveSongUpdate)
      socket.off('refundSuccess', handleRefundSuccess)
      socket.off('refundError', handleRefundError)
    }
  }, [socket])

  const handleDeleteSong = (requestId: string) => {
    if (!socket || !isAdmin) return
    socket.emit('adminDeleteSong', { requestId })
  }

  const handleRefundSong = (requestId: string) => {
    if (!socket || !isAdmin) return
    
    setRefundingId(requestId)
    setShowRefundModal(true)
  }

  const submitRefund = () => {
    if (!socket || !refundingId || !refundReason.trim()) return
    
    socket.emit('adminRefundQueueSong', { 
      requestId: refundingId, 
      reason: refundReason.trim() 
    })
  }

  const handleMarkFinished = () => {
    if (!socket || !isAdmin) return
    socket.emit('adminMarkFinished')
  }

  const handleSkipSong = () => {
    if (!socket || !isAdmin) return
    socket.emit('adminSkipSong')
  }

  const filteredQueue = queueState.queue.filter(song =>
    searchTerm === "" ||
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.requester.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-brand-purple-light">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-sm text-brand-purple-light">
          {filteredQueue.length} songs in queue
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search songs, artists, or requesters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-brand-purple-dark/50 border border-brand-purple-neon/20 rounded-lg text-white placeholder-brand-purple-light/50 focus:outline-none focus:border-brand-purple-neon/50"
        />
      </div>

      {/* Currently Playing */}
      {queueState.activeSong && (
        <div className="p-4 bg-brand-purple-neon/10 border border-brand-purple-neon/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-brand-purple-light">Now Playing</h3>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkFinished}
                  className="text-xs"
                >
                  Mark Finished
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSkipSong}
                  className="text-xs text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {queueState.activeSong.thumbnailUrl && (
              <img 
                src={queueState.activeSong.thumbnailUrl} 
                alt="Thumbnail"
                className="w-16 h-16 rounded object-cover"
              />
            )}
            <div>
              <h4 className="font-semibold text-white">{queueState.activeSong.title}</h4>
              <p className="text-brand-purple-light">{queueState.activeSong.artist}</p>
              <p className="text-sm text-brand-purple-light/70">
                Requested by {queueState.activeSong.requester}
                {queueState.activeSong.requestType === 'donation' && queueState.activeSong.donationInfo && (
                  <span className="ml-2 px-2 py-1 text-xs bg-brand-purple-neon text-black rounded">
                    ${queueState.activeSong.donationInfo.amount} {queueState.activeSong.donationInfo.currency}
                  </span>
                )}
                {queueState.activeSong.refunded && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded">
                    Refunded
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-2">
        {filteredQueue.length === 0 ? (
          <div className="text-center py-8 text-brand-purple-light/70">
            {searchTerm ? 'No songs match your search.' : 'No songs in queue.'}
          </div>
        ) : (
          filteredQueue.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center gap-4 p-4 bg-brand-purple-dark/30 hover:bg-brand-purple-dark/50 rounded-lg border border-brand-purple-neon/10 hover:border-brand-purple-neon/30 transition-colors"
            >
              <div className="text-brand-purple-light/70 font-semibold w-8 text-center">
                {index + 1}
              </div>
              
              {song.thumbnailUrl && (
                <img 
                  src={song.thumbnailUrl} 
                  alt="Thumbnail"
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white truncate">{song.title}</h4>
                <p className="text-brand-purple-light truncate">{song.artist}</p>
                <div className="flex items-center gap-3 text-sm text-brand-purple-light/70">
                  <span>Requested by {song.requester}</span>
                  {song.durationSeconds && (
                    <span>• {formatDuration(song.durationSeconds)}</span>
                  )}
                  <span>• {formatTimestamp(song.timestamp)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {song.requestType === 'donation' && song.donationInfo && (
                  <span className="px-2 py-1 text-xs bg-brand-purple-neon text-black rounded font-semibold">
                    ${song.donationInfo.amount} {song.donationInfo.currency}
                  </span>
                )}
                {song.requestType === 'channelPoint' && (
                  <span className="px-2 py-1 text-xs bg-brand-pink-neon text-black rounded font-semibold">
                    Points
                  </span>
                )}
                {song.refunded && (
                  <span className="px-2 py-1 text-xs bg-red-500 text-white rounded font-semibold">
                    Refunded
                  </span>
                )}
                {song.youtubeUrl && (
                  <a
                    href={song.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-500 hover:text-red-400 transition-colors"
                    title="Watch on YouTube"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                )}
                
                {/* Admin Controls */}
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefundSong(song.id)}
                      className="text-xs text-orange-400 border-orange-400 hover:bg-orange-400/10"
                      disabled={song.refunded}
                    >
                      Refund
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSong(song.id)}
                      className="text-xs text-red-400 border-red-400 hover:bg-red-400/10"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-brand-purple-dark border border-brand-purple-neon/30 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Refund Song Request</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-purple-light mb-1">
                  Refund Reason
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund..."
                  className="w-full px-3 py-2 bg-brand-purple-dark/50 border border-brand-purple-neon/20 rounded text-white placeholder-brand-purple-light/50 focus:outline-none focus:border-brand-purple-neon/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRefundModal(false)
                    setRefundingId(null)
                    setRefundReason("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitRefund}
                  disabled={!refundReason.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Refund
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
