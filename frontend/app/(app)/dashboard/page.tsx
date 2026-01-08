'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { useDashboardStats, useJourneyActivityLogs } from '@/lib/hooks/use-dashboard';
import { useJourneys } from '@/lib/hooks/use-journeys';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Bot,
  TrendingUp,
  Users,
  PhoneCall,
  XCircle,
  Clock,
  UserX,
  BarChart3,
  ArrowRightLeft,
  UserPlus,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Base item variant for sections
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

// Individual animation variants for each metric card
const createItemVariants = (index: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4 + (index * 0.1),
      delay: index * 0.08,
      type: 'spring',
      stiffness: 200 + (index * 20),
      damping: 20,
    },
  },
});

// Individual animation variants for metric values
const createValueVariants = (index: number) => ({
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5 + (index * 0.05),
      delay: 0.2 + (index * 0.1),
      type: 'spring',
      stiffness: 150 + (index * 15),
      damping: 15,
    },
  },
});

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const { data: journeys } = useJourneys();
  const activeJourneys = useMemo(() => journeys?.filter(j => j.status === 'ACTIVE') || [], [journeys]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');
  const { data: stats, isLoading: statsLoading } = useDashboardStats(timeRange);
  const { data: activityLogs, isLoading: activityLogsLoading } = useJourneyActivityLogs(
    selectedJourneyId,
    50
  );

  // Set first active journey as default if available
  useEffect(() => {
    if (activeJourneys.length > 0 && !selectedJourneyId) {
      setSelectedJourneyId(activeJourneys[0].id);
    }
  }, [activeJourneys, selectedJourneyId]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // ===== ORIGINAL CONTENT (COMMENTED OUT) =====
  /*
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-medium text-foreground">{user?.firstName || user?.email}</span>!
            </p>
          </div>
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
  */

  // ===== NEW MODERN REDESIGN =====
  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Enhanced Header */}
      <motion.div variants={itemVariants} className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Welcome back, <span className="font-semibold text-foreground">{user?.firstName || user?.email}</span>! 👋
            </p>
          </div>
          <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  timeRange === range
                    ? 'bg-foreground text-background shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* SMS Metrics - Enhanced */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-1 w-8 rounded-full bg-foreground"></div>
          <h2 className="text-2xl font-bold text-foreground">SMS Metrics</h2>
        </div>
        <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
          <motion.div
            variants={createItemVariants(0)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50 shadow-soft hover:shadow-medium group relative overflow-hidden">
              <div className="absolute inset-0 bg-muted/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-foreground">Messages Sent</CardTitle>
                <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-soft">
                  <Send className="h-6 w-6 text-foreground" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div
                  className="text-3xl font-bold text-foreground mb-2"
                  variants={createValueVariants(0)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                  ) : (
                    stats?.messagesSent?.toLocaleString() || '0'
                  )}
                </motion.div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    {stats?.messagesDelivered || 0} delivered
                  </p>
                  {stats?.messagesFailed ? (
                    <span className="text-xs text-muted-foreground font-medium">
                      ({stats.messagesFailed} failed)
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(1)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Delivery Rate</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(1)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : `${stats?.deliveryRate || 0}%`}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.messagesDelivered || 0} of {stats?.messagesSent || 0} delivered
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(2)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Replies</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(2)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : stats?.replies?.toLocaleString() || '0'}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">Inbound messages</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(3)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">AI Usage</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(3)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : stats?.aiUsage?.toLocaleString() || '0'}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">AI-enabled campaigns</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Call Metrics - Enhanced */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-1 w-8 rounded-full bg-foreground"></div>
          <h2 className="text-2xl font-bold text-foreground">Call Metrics</h2>
        </div>
        <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" variants={containerVariants}>
          <motion.div
            variants={createItemVariants(4)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Calls Placed</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <PhoneCall className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(4)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : stats?.callsPlaced?.toLocaleString() || '0'}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.callsAnswered || 0} answered
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(5)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Answer Rate</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(5)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : `${stats?.callAnswerRate || 0}%`}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.callsAnswered || 0} of {stats?.callsPlaced || 0} calls
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(6)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Avg Call Duration</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(6)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : formatDuration(stats?.averageCallDuration || 0)}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {formatDuration(stats?.totalCallDuration || 0)}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(7)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Transfers Completed</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <ArrowRightLeft className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(7)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : stats?.transfersCompleted?.toLocaleString() || '0'}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.transfersAttempted || 0} attempted ({stats?.transferRate || 0}% of answered calls)
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(8)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Failed Calls</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(8)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : stats?.callsFailed?.toLocaleString() || '0'}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">Failed calls (excludes no answer)</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* New Metrics Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-1 w-8 rounded-full bg-foreground"></div>
          <h2 className="text-2xl font-bold text-foreground">Lead Metrics</h2>
        </div>
        <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" variants={containerVariants}>
          <motion.div
            variants={createItemVariants(9)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Leads Ingested</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(9)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : stats?.leadsIngested?.toLocaleString() || '0'}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">New contacts added</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(10)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Contact Rate (0-7d)</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(10)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : `${stats?.contactRateByLeadAge?.age0to7?.rate || 0}%`}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.contactRateByLeadAge?.age0to7?.answered || 0} of {stats?.contactRateByLeadAge?.age0to7?.total || 0} answered
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(11)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Contact Rate (8-14d)</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(11)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : `${stats?.contactRateByLeadAge?.age8to14?.rate || 0}%`}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.contactRateByLeadAge?.age8to14?.answered || 0} of {stats?.contactRateByLeadAge?.age8to14?.total || 0} answered
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(12)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Contact Rate (15-30d)</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(12)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : `${stats?.contactRateByLeadAge?.age15to30?.rate || 0}%`}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.contactRateByLeadAge?.age15to30?.answered || 0} of {stats?.contactRateByLeadAge?.age15to30?.total || 0} answered
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={createItemVariants(13)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="hover-lift border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Contact Rate (31+d)</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  variants={createValueVariants(13)}
                  initial="hidden"
                  animate="visible"
                >
                  {statsLoading ? '...' : `${stats?.contactRateByLeadAge?.age31plus?.rate || 0}%`}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.contactRateByLeadAge?.age31plus?.answered || 0} of {stats?.contactRateByLeadAge?.age31plus?.total || 0} answered
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div className="grid gap-4 md:grid-cols-2" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <Card className="hover-lift border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Journey Activity Logs</CardTitle>
                  <CardDescription>Recent activity from selected journey</CardDescription>
                </div>
                <Link href="/journeys">
                  <span className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors">View all</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <select
                  value={selectedJourneyId}
                  onChange={(e) => setSelectedJourneyId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring hover:border-accent/50"
                >
                  <option value="">Select a journey</option>
                  {journeys?.map((journey) => (
                    <option key={journey.id} value={journey.id}>
                      {journey.name} ({journey.status})
                    </option>
                  ))}
                </select>
              </div>
              {activityLogsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !selectedJourneyId ? (
                <div className="space-y-3 py-4">
                  <p className="text-sm text-muted-foreground">Select a journey to view activity logs</p>
                </div>
              ) : activityLogs && activityLogs.length === 0 ? (
                <div className="space-y-3 py-4">
                  <p className="text-sm text-muted-foreground">No activity logs yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {activityLogs?.slice(0, 20).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-border/50 hover:bg-accent/5 hover:border-accent/50 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground">{log.contactName}</p>
                            <Badge variant="outline" className="text-xs">
                              {log.nodeType}
                            </Badge>
                            {log.journeyDay && (
                              <Badge variant="secondary" className="text-xs">
                                Day {log.journeyDay}
                              </Badge>
                            )}
                            {log.callNumber && (
                              <Badge variant="secondary" className="text-xs">
                                Call {log.callNumber}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{log.nodeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.executedAt
                              ? formatDistanceToNow(new Date(log.executedAt), { addSuffix: true })
                              : log.scheduledAt
                              ? `Scheduled: ${formatDistanceToNow(new Date(log.scheduledAt), { addSuffix: true })}`
                              : 'Pending'}
                          </p>
                          {log.result?.outcome && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Outcome: {log.result.outcome}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            log.status === 'COMPLETED'
                              ? 'default'
                              : log.status === 'FAILED'
                              ? 'destructive'
                              : log.status === 'EXECUTING'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {log.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover-lift border-border/50">
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
              <CardDescription>Key metrics and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/30 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Open Conversations</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {statsLoading ? '...' : stats?.openConversations || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Total Contacts</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {statsLoading ? '...' : stats?.totalContacts?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/30 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Qualified Leads</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {statsLoading ? '...' : stats?.qualifiedLeads?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/30 flex items-center justify-center">
                      <UserX className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Opted Out</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {statsLoading ? '...' : stats?.optedOutContacts?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
