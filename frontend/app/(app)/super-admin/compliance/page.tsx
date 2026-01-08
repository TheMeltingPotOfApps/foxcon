'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAllTenantsCompliance,
  useTenantCompliance,
  useTenantTemplatesCompliance,
} from '@/lib/hooks/use-compliance';
import { apiClient } from '@/lib/api/client';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Building2,
  TrendingUp,
  AlertCircle,
  Info,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

export default function SuperAdminCompliancePage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const { data: tenants } = useQuery({
    queryKey: ['super-admin', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/tenants');
      return response.data;
    },
  });

  const { data: allCompliance, isLoading: complianceLoading, refetch: refetchCompliance } = useAllTenantsCompliance();
  const { data: tenantCompliance } = useTenantCompliance(selectedTenantId);
  const { data: templatesCompliance } = useTenantTemplatesCompliance(selectedTenantId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'non_compliant':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'needs_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'non_compliant':
        return <XCircle className="h-4 w-4" />;
      case 'needs_review':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Compliance Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and ensure SMS templates comply with TCPA, CAN-SPAM, and carrier guidelines
          </p>
        </div>
        <Button onClick={() => refetchCompliance()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allCompliance?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliant</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {allCompliance?.filter(t => t.overallStatus === 'compliant').length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {allCompliance?.filter(t => t.overallStatus === 'needs_review').length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
                <XCircle className="h-5 w-5 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {allCompliance?.filter(t => t.overallStatus === 'non_compliant').length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenant Compliance List */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Compliance Status</CardTitle>
              <CardDescription>Compliance ratings for all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              {complianceLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary mx-auto"></div>
                </div>
              ) : allCompliance && allCompliance.length > 0 ? (
                <div className="space-y-3">
                  {allCompliance.map((tenant) => (
                    <div
                      key={tenant.tenantId}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setSelectedTenantId(tenant.tenantId);
                        setActiveTab('tenant');
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">{tenant.tenantName}</span>
                          <Badge className={getStatusColor(tenant.overallStatus)}>
                            {getStatusIcon(tenant.overallStatus)}
                            <span className="ml-1 capitalize">{tenant.overallStatus.replace('_', ' ')}</span>
                          </Badge>
                          <Badge variant="outline">
                            Score: {tenant.complianceScore}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Templates: {tenant.totalTemplates}</span>
                          <span className="text-green-600">✓ {tenant.compliantTemplates}</span>
                          <span className="text-yellow-600">⚠ {tenant.needsReviewTemplates}</span>
                          <span className="text-red-600">✗ {tenant.nonCompliantTemplates}</span>
                        </div>
                        {tenant.issues.critical > 0 && (
                          <div className="mt-2 text-sm text-red-600">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {tenant.issues.critical} critical issue{tenant.issues.critical !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTenantId(tenant.tenantId);
                          setActiveTab('tenant');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tenant compliance data found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Tenant</CardTitle>
              <CardDescription>Choose a tenant to review compliance details</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  if (e.target.value) {
                    setActiveTab('tenant');
                  }
                }}
              >
                <option value="">Select a tenant...</option>
                {tenants?.map((tenant: any) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {selectedTenantId && tenantCompliance && (
            <>
              {/* Tenant Compliance Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{tenantCompliance.tenantName}</CardTitle>
                      <CardDescription>Compliance Summary</CardDescription>
                    </div>
                    <Badge className={getStatusColor(tenantCompliance.overallStatus)}>
                      {getStatusIcon(tenantCompliance.overallStatus)}
                      <span className="ml-1 capitalize">{tenantCompliance.overallStatus.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-3xl font-bold">{tenantCompliance.complianceScore}%</div>
                      <div className="text-sm text-muted-foreground">Compliance Score</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">{tenantCompliance.compliantTemplates}</div>
                      <div className="text-sm text-muted-foreground">Compliant</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-yellow-600">{tenantCompliance.needsReviewTemplates}</div>
                      <div className="text-sm text-muted-foreground">Needs Review</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-red-600">{tenantCompliance.nonCompliantTemplates}</div>
                      <div className="text-sm text-muted-foreground">Non-Compliant</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-600">
                        <XCircle className="h-4 w-4 inline mr-1" />
                        {tenantCompliance.issues.critical} Critical
                      </span>
                      <span className="text-yellow-600">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        {tenantCompliance.issues.warnings} Warnings
                      </span>
                      <span className="text-blue-600">
                        <Info className="h-4 w-4 inline mr-1" />
                        {tenantCompliance.issues.info} Info
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Template Compliance Details */}
              {templatesCompliance && templatesCompliance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Template Compliance Details</CardTitle>
                    <CardDescription>Individual template compliance checks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {templatesCompliance.map((template) => (
                        <div key={template.templateId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <span className="font-semibold">{template.templateName}</span>
                              <Badge className={getStatusColor(template.overallStatus)}>
                                {getStatusIcon(template.overallStatus)}
                                <span className="ml-1 capitalize">{template.overallStatus.replace('_', ' ')}</span>
                              </Badge>
                              <Badge variant="outline">Score: {template.complianceScore}%</Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {template.checks.map((check, idx) => (
                              <div
                                key={idx}
                                className={`flex items-start gap-2 p-2 rounded ${
                                  !check.passed && check.severity === 'error'
                                    ? 'bg-red-50 border border-red-200'
                                    : !check.passed && check.severity === 'warning'
                                    ? 'bg-yellow-50 border border-yellow-200'
                                    : 'bg-gray-50'
                                }`}
                              >
                                {getSeverityIcon(check.severity)}
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{check.rule.replace(/_/g, ' ')}</div>
                                  <div className="text-xs text-muted-foreground">{check.message}</div>
                                </div>
                                {check.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

