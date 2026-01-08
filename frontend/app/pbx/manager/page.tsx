'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Phone,
  PhoneIncoming,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useRealTimeStats, useAgentExtensions, useQueues } from '@/lib/hooks/use-pbx';
import { motion } from 'framer-motion';

export default function ManagerDashboardPage() {
  const { data: realTimeStats } = useRealTimeStats();
  const { data: agents } = useAgentExtensions();
  const { data: queues } = useQueues();

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
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time monitoring and performance metrics
        </p>
      </div>

      {/* Real-time Metrics */}
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

      {/* Agent Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents?.map((agent: any) => (
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

      {/* Queue Status */}
      {queues && queues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queues.map((queue: any) => (
                <div
                  key={queue.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{queue.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Queue: {queue.queueNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Agents</p>
                      <p className="text-lg font-bold">
                        {queue.agentIds?.length || 0}
                      </p>
                    </div>
                    <Badge
                      variant={queue.isActive ? 'default' : 'secondary'}
                    >
                      {queue.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

