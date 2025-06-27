"use client"

import { useState, useEffect } from "react"
import io, { Socket } from "socket.io-client"
import AdminDashboard from "@/components/AdminDashboard"
import SongRequestQueue from "@/components/SongRequestQueue"
import { QueueState } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Lock } from "lucide-react"

export default function AdminPage() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
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

    const handleAdminAuthSuccess = () => {
      setIsAuthenticated(true)
      setLoginError("")
      console.log('Admin authentication successful')
    }

    const handleAdminAuthFailed = (data: { message: string }) => {
      setIsAuthenticated(false)
      setLoginError(data.message || "Authentication failed")
      console.log('Admin authentication failed')
    }

    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)
    socketInstance.on('queueUpdate', handleQueueUpdate)
    socketInstance.on('activeSongUpdate', handleActiveSongUpdate)
    socketInstance.on('historyUpdate', handleHistoryUpdate)
    socketInstance.on('adminAuthSuccess', handleAdminAuthSuccess)
    socketInstance.on('adminAuthFailed', handleAdminAuthFailed)

    setSocket(socketInstance)

    return () => {
      socketInstance.off('connect', handleConnect)
      socketInstance.off('disconnect', handleDisconnect)
      socketInstance.off('queueUpdate', handleQueueUpdate)
      socketInstance.off('activeSongUpdate', handleActiveSongUpdate)
      socketInstance.off('historyUpdate', handleHistoryUpdate)
      socketInstance.off('adminAuthSuccess', handleAdminAuthSuccess)
      socketInstance.off('adminAuthFailed', handleAdminAuthFailed)
      socketInstance.disconnect()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!socket || !username.trim()) {
      setLoginError("Please enter a username")
      return
    }
    
    console.log('Attempting to authenticate as:', username)
    socket.emit('adminAuth', { username: username.trim(), password })
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <p className="text-muted-foreground">
              Enter your credentials to access the admin dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your Twitch username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password (any value)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Password is optional - authentication is based on username only
                </p>
              </div>
              {loginError && (
                <div className="text-red-500 text-sm">{loginError}</div>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!isConnected || !username.trim()}
              >
                <Lock className="w-4 h-4 mr-2" />
                {isConnected ? 'Login' : 'Connecting...'}
              </Button>
            </form>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Valid usernames:</strong> ayyymeur, tracklistlivebot
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Connection status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400">Logged in as: {username}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsAuthenticated(false)
              setUsername("")
              setPassword("")
            }}
          >
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Admin Dashboard */}
          <div>
            <AdminDashboard userLogin={username} />
          </div>
          
          {/* Queue Management */}
          <div>
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-6">
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
