"use client"

import { useState, useEffect } from "react"
import io, { Socket } from "socket.io-client"
import AdminDashboard from "@/components/AdminDashboard"
import SongRequestQueue from "@/components/SongRequestQueue"
import { QueueState } from "@/lib/types"

export default function AdminPage() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [queueState, setQueueState] = useState<QueueState>({
    queue: [],
    activeSong: null,
    isLoading: false
  })
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    // Connect to Socket.IO server
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    })

    const handleConnect = () => {
      console.log('Connected to server')
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    }

    const handleQueueUpdate = (queue: any[]) => {
      setQueueState(prev => ({ ...prev, queue }))
    }

    const handleActiveSongUpdate = (activeSong: any) => {
      setQueueState(prev => ({ ...prev, activeSong }))
    }

    const handleHistoryUpdate = (historyData: any[]) => {
      setHistory(historyData)
    }

    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)
    socketInstance.on('queueUpdate', handleQueueUpdate)
    socketInstance.on('activeSongUpdate', handleActiveSongUpdate)
    socketInstance.on('historyUpdate', handleHistoryUpdate)

    setSocket(socketInstance)

    return () => {
      socketInstance.off('connect', handleConnect)
      socketInstance.off('disconnect', handleDisconnect)
      socketInstance.off('queueUpdate', handleQueueUpdate)
      socketInstance.off('activeSongUpdate', handleActiveSongUpdate)
      socketInstance.off('historyUpdate', handleHistoryUpdate)
      socketInstance.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-purple-dark via-brand-purple-medium to-brand-purple-dark">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Admin Dashboard */}
          <div>
            <AdminDashboard />
          </div>
          
          {/* Queue Management */}
          <div>
            <div className="bg-brand-purple-dark/50 border border-brand-purple-neon/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Queue Management</h2>
              <SongRequestQueue 
                socket={socket} 
                isConnected={isConnected} 
                initialState={queueState}
                isAdmin={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
