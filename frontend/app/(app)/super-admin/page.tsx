'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Building2,
  TrendingUp,
  Activity,
  Eye,
  Calendar,
  BarChart3,
  Globe,
  Clock,
  ArrowRight,
  FileText,
  Mail,
  Phone,
  MessageSquare,
  Route,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { format } from 'date-fns';

export default function SuperAdminPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin', 'stats', dateRange],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/stats', {
        params: dateRange,
      });
      return response.data;
    },
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['super-admin', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/tenants');
      return response.data;
    },
  });

  const { data: traffic, isLoading: trafficLoading } = useQuery({
    queryKey: ['super-admin', 'traffic', dateRange],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/traffic', {
        params: dateRange,
      });
      return response.data;
    },
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['super-admin', 'activities', dateRange],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/activities', {
        params: { ...dateRange, limit: 50 },
      });
      return response.data;
    },
  });

  const { data: tenantDetails, isLoading: tenantDetailsLoading } = useQuery({
    queryKey: ['super-admin', 'tenant-details', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const response = await apiClient.get(`/super-admin/tenants/${selectedTenantId}`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const statCards = [
    {
      title: 'Total Tenants',
      value: stats?.totalTenants || 0,
      icon: Building2,
      change: stats?.activeTenants || 0,
      changeLabel: 'Active',
    },
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
    },
    {
      title: 'Page Views',
      value: stats?.totalPageViews || 0,
      icon: Eye,
      period: '30 days',
    },
    {
      title: 'Activities',
      value: stats?.totalActivities || 0,
      icon: Activity,
      period: '30 days',
    },
    {
      title: 'Subscriptions',
      value: stats?.totalSubscriptions || 0,
      icon: TrendingUp,
      change: stats?.activeSubscriptions || 0,
      changeLabel: 'Active',
    },
    {
      title: 'Upcoming Events',
      value: stats?.upcomingEvents || 0,
      icon: Calendar,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor all tenants, traffic, and system activity
            </p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="hover-lift border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">{stat.value.toLocaleString()}</div>
                  {stat.change !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {stat.change} {stat.changeLabel}
                    </p>
                  )}
                  {stat.period && (
                    <p className="text-sm text-muted-foreground">{stat.period}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Traffic Analytics */}
        {traffic && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Top Pages
                </CardTitle>
                <CardDescription>Most visited pages in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {traffic.topPages?.slice(0, 10).map((page: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1">{page.path || '/'}</span>
                      <Badge variant="secondary">{page.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Top Countries
                </CardTitle>
                <CardDescription>Traffic by country</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {traffic.topCountries?.slice(0, 10).map((country: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{country.country || 'Unknown'}</span>
                      <Badge variant="secondary">{country.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activities */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Tenant Activities
            </CardTitle>
            <CardDescription>Latest actions across all tenants</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary mx-auto"></div>
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.slice(0, 20).map((activity: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{activity.activityType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Tenant: {activity.tenantId?.substring(0, 8)}...
                        </span>
                      </div>
                      {activity.metadata && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {JSON.stringify(activity.metadata)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(activity.createdAt), 'MMM d, HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No activities found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenants List */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              All Tenants
            </CardTitle>
            <CardDescription>Complete list of all tenants in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary mx-auto"></div>
              </div>
            ) : tenants && tenants.length > 0 ? (
              <div className="space-y-3">
                {tenants.map((tenant: any, idx: number) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover-lift"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{tenant.name || 'Unnamed Tenant'}</span>
                        <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                          {tenant.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {tenant.id} • Created: {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTenantId(tenant.id)}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tenants found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Details Dialog */}
        <Dialog open={!!selectedTenantId} onOpenChange={(open) => !open && setSelectedTenantId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tenant Details</DialogTitle>
              <DialogDescription>
                Complete information about the selected tenant
              </DialogDescription>
            </DialogHeader>
            {tenantDetailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
              </div>
            ) : tenantDetails ? (
              <div className="space-y-6">
                {/* Tenant Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tenant Name</p>
                      <p className="font-semibold">{tenantDetails.tenant?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={tenantDetails.tenant?.isActive ? 'default' : 'secondary'}>
                        {tenantDetails.tenant?.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tenant ID</p>
                      <p className="font-mono text-sm">{tenantDetails.tenant?.id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {tenantDetails.tenant?.createdAt
                          ? format(new Date(tenantDetails.tenant.createdAt), 'MMM d, yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{tenantDetails.userCount || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{tenantDetails.templates || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Campaigns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{tenantDetails.campaigns || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Route className="h-4 w-4" />
                        Journeys
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{tenantDetails.journeys || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{tenantDetails.contacts || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Web Visits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{tenantDetails.webVisits || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Subscription Info */}
                {tenantDetails.subscription && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Subscription
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant={tenantDetails.subscription.status === 'active' ? 'default' : 'secondary'}>
                            {tenantDetails.subscription.status || 'N/A'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Plan</p>
                          <p className="font-semibold">{tenantDetails.subscription.planName || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activities */}
                {tenantDetails.recentActivities && tenantDetails.recentActivities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {tenantDetails.recentActivities.slice(0, 10).map((activity: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded border bg-card"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{activity.activityType}</Badge>
                              {activity.metadata && (
                                <span className="text-sm text-muted-foreground">
                                  {JSON.stringify(activity.metadata)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(activity.createdAt), 'MMM d, HH:mm')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/super-admin/limits?tenant=${selectedTenantId}`, '_blank')}
                  >
                    Manage Limits
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/super-admin/compliance?tenant=${selectedTenantId}`, '_blank')}
                  >
                    View Compliance
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTenantId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tenant details found
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

