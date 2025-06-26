'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Music, 
  Settings, 
  BarChart3, 
  Play, 
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
  Shield,
  RefreshCw,
  Volume2
} from 'lucide-react'

export default function HomePage() {
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState({
    totalSongs: 0,
    activeSessions: 0,
    totalRefunds: 0
  })

  // Simulate connection status for demo
  useEffect(() => {
    const timer = setTimeout(() => setIsConnected(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">TrackList Live</h1>
                <p className="text-muted-foreground">Twitch Song Request System</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'System Online' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ready</div>
              <p className="text-xs text-muted-foreground">Accepting requests</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSessions}</div>
              <p className="text-xs text-muted-foreground">Connected streamers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSongs}</div>
              <p className="text-xs text-muted-foreground">Requests handled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-green-500" />
                <CardTitle>Live Queue Management</CardTitle>
                <Badge variant="secondary">Real-time</Badge>
              </div>
              <CardDescription>
                Interactive song request queue with drag-and-drop reordering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Instant request processing</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Queue time estimation</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Volume2 className="h-4 w-4 text-purple-500" />
                <span>Auto-skip and playback controls</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-500" />
                <CardTitle>Smart Refund System</CardTitle>
                <Badge variant="outline">Advanced</Badge>
              </div>
              <CardDescription>
                Automated refund processing with detailed tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span>StreamElements integration</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Fraud protection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span>Refund analytics</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-2">
                <Play className="h-6 w-6 text-red-500" />
              </div>
              <CardTitle className="text-lg">YouTube Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Seamless YouTube video processing with metadata extraction
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <CardTitle className="text-lg">Twitch Bot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Native Twitch chat integration with command support
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-2">
                <DollarSign className="h-6 w-6 text-orange-500" />
              </div>
              <CardTitle className="text-lg">StreamElements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Channel points and donation request handling
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admin">
              <Button size="lg" className="w-full sm:w-auto">
                <Settings className="w-5 h-5 mr-2" />
                Open Admin Dashboard
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.open('https://github.com/yourusername/tracklist-live', '_blank')}
            >
              <Music className="w-5 h-5 mr-2" />
              View Documentation
            </Button>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Configure your Twitch bot credentials and StreamElements settings to get started with song requests
          </p>
        </div>
      </div>
    </div>
  )
}
