import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface StatisticsCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: string
}

export function StatisticsCard({ title, value, icon, trend }: StatisticsCardProps) {
  return (
    <Card className="bg-brand-purple-dark/50 border-brand-purple-neon/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-brand-purple-light">
          {title}
        </CardTitle>
        <div className="text-brand-purple-neon">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {value}
        </div>
        {trend && (
          <p className="text-xs text-brand-purple-light/70">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
