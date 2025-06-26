'use client'

import React, { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { ScrollArea } from '../components/ui/scroll-area'
import { 
  Play, 
  Pause, 
  SkipForward, 
  Trash2, 
  RefreshCw, 
  DollarSign,
  Users, 
  Music, 
  Clock,
  Ban,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { SongRequest } from '@/lib/types'
import { formatDuration, formatTimestamp } from '@/lib/utils'

interface AdminDashboardProps {
  userLogin?: string
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userLogin }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [queue, setQueue] = useState<SongRequest[]>([])
  const [history, setHistory] = useState<SongRequest[]>([])
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalDonations: 0,
    totalRefunds: 0,
    activeUsers: 0
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SongRequest | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [blockUserModal, setBlockUserModal] = useState(false)
  const [userToBlock, setUserToBlock] = useState('')

  // Socket.IO connection
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to admin dashboard')
      
      // Authenticate as admin
      if (userLogin) {
        newSocket.emit('adminAuth', { username: userLogin })
      }
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('adminAuthSuccess', () => {
      setIsAuthenticated(true)
      // Request initial data
      newSocket.emit('getQueue')
      newSocket.emit('getHistory')
      newSocket.emit('getStats')
    })

    newSocket.on('adminAuthFailed', () => {
      setIsAuthenticated(false)
    })

    newSocket.on('queueUpdated', (newQueue: SongRequest[]) => {
      setQueue(newQueue)
    })

    newSocket.on('historyUpdated', (newHistory: SongRequest[]) => {
      setHistory(newHistory)
    })

    newSocket.on('statsUpdated', (newStats: any) => {
      setStats(newStats)
    })

    return () => {
      newSocket.close()
    }
  }, [userLogin])

  // Admin actions
  const handleFinishSong = (songId: string) => {
    socket?.emit('adminFinishSong', { songId })
  }

  const handleSkipSong = (songId: string) => {
    socket?.emit('adminSkipSong', { songId })
  }

  const handleDeleteSong = (songId: string) => {
    socket?.emit('adminDeleteSong', { songId })
  }

  const handleRefundSong = (song: SongRequest) => {
    setSelectedSong(song)
    setRefundModalOpen(true)
  }

  const confirmRefund = () => {
    if (selectedSong && refundReason.trim()) {
      const isInQueue = queue.some(s => s.id === selectedSong.id)
      
      if (isInQueue) {
        socket?.emit('adminRefundQueueSong', {
          songId: selectedSong.id,
          reason: refundReason.trim()
        })
      } else {
        socket?.emit('adminRefundHistorySong', {
          songId: selectedSong.id,
          reason: refundReason.trim()
        })
      }
      
      setRefundModalOpen(false)
      setRefundReason('')
      setSelectedSong(null)
    }
  }

  const handleBlockUser = (username: string) => {
    setUserToBlock(username)
    setBlockUserModal(true)
  }

  const confirmBlockUser = () => {
    if (userToBlock.trim()) {
      socket?.emit('adminBlockUser', { username: userToBlock.trim() })
      setBlockUserModal(false)
      setUserToBlock('')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Admin Authentication Required</CardTitle>
            <CardDescription>
              You need to be an authorized admin to access this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your song request queue</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSongs}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalDonations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Length</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queue.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRefunds}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Queue Management</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Queue Management Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Queue ({queue.length} songs)</CardTitle>
              <CardDescription>
                Manage the current song request queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {queue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No songs in queue
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((song, index) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium">#{index + 1}</div>
                          <img
                            src={song.thumbnailUrl || undefined}
                            alt={song.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <div className="font-medium">{song.title}</div>
                            <div className="text-sm text-muted-foreground">
                              by {song.artist} • {formatDuration(song.durationSeconds)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Requested by {song.requester}
                              {song.donationInfo?.amount && (
                                <Badge variant="secondary" className="ml-2">
                                  ${song.donationInfo?.amount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFinishSong(song.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSkipSong(song.id)}
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefundSong(song)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSong(song.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => song.requesterLogin && handleBlockUser(song.requesterLogin)}
                            disabled={!song.requesterLogin}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Song History</CardTitle>
              <CardDescription>
                Recently played and completed songs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No history available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={song.thumbnailUrl ?? undefined}
                            alt={song.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <div className="font-medium">{song.title}</div>
                            <div className="text-sm text-muted-foreground">
                              by {song.artist} • {formatDuration(song.durationSeconds)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Requested by {song.requester} • {formatTimestamp(song.timestamp || '')}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefundSong(song)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Settings</CardTitle>
              <CardDescription>
                Configure your admin dashboard preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Settings panel coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Modal */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Song Request</DialogTitle>
            <DialogDescription>
              Provide a reason for refunding this song request. The user will be notified in chat.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSong && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedSong.thumbnailUrl ?? undefined}
                  alt={selectedSong.title}
                  className="w-12 h-12 rounded object-cover"
                />
                <div>
                  <div className="font-medium">{selectedSong.title}</div>
                  <div className="text-sm text-muted-foreground">
                    by {selectedSong.artist}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Requested by {selectedSong.requester}
                    {selectedSong.donationInfo?.amount && (
                      <span> • ${selectedSong.donationInfo.amount}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Refund Reason</Label>
                <Textarea
                  id="refund-reason"
                  placeholder="Enter reason for refund..."
                  value={refundReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRefundReason(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRefund} disabled={!refundReason.trim()}>
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Modal */}
      <Dialog open={blockUserModal} onOpenChange={setBlockUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              This will prevent the user from making future song requests.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username to block..."
              value={userToBlock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserToBlock(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBlockUser} disabled={!userToBlock.trim()}>
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminDashboard
