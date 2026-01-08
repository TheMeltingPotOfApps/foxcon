'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Users,
  Activity,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { useRealTimeStats, useAgentExtensions } from '@/lib/hooks/use-pbx';
import { useAuthStore } from '@/store/auth-store';
import { usePbxWebSocket } from '@/lib/hooks/use-pbx-websocket';

export default function PbxDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data: realTimeStats } = useRealTimeStats();
  const { data: agents } = useAgentExtensions();
  const { isConnected } = usePbxWebSocket();
  const userRole = (user as any)?.role || 'AGENT';
  const isManager = ['MANAGER', 'ADMIN', 'OWNER'].includes(userRole);

  const agentExtension = agents?.find((ext: any) => ext.userId === user?.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-500';
      case 'ON_CALL':
        return 'bg-blue-500';
      case 'BUSY':
        return 'bg-yellow-500';
      case 'AWAY':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">PBX Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || user?.email}!
            {agentExtension && ` (Extension: ${agentExtension.extension})`}
          </p>
        </div>
        <Badge
          variant={isConnected ? 'default' : 'destructive'}
          className="flex items-center gap-2"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realTimeStats?.activeCalls || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting Calls</CardTitle>
            <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realTimeStats?.waitingCalls || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realTimeStats?.availableAgents || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busy Agents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realTimeStats?.busyAgents || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status (for Managers) */}
      {isManager && agents && agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agents.map((agent: any) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {agent.user?.firstName} {agent.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ext: {agent.extension}
                      </p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        agent.status,
                      )}`}
                    />
                  </div>
                  <Badge variant="outline">{agent.status}</Badge>
                  {agent.currentCallId && (
                    <p className="text-xs text-muted-foreground">
                      On call
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/pbx/agent'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneOutgoing className="h-5 w-5" />
              Agent Portal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access your agent interface to handle calls, view leads, and manage your status.
            </p>
          </CardContent>
        </Card>

        {isManager && (
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/pbx/manager'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Manager Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor team performance, view real-time metrics, and manage queues.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

