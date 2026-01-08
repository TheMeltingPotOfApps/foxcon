import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ComplianceCheck {
  rule: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ComplianceResult {
  templateId: string;
  templateName: string;
  tenantId: string;
  tenantName: string;
  overallStatus: 'compliant' | 'non_compliant' | 'needs_review';
  complianceScore: number;
  checks: ComplianceCheck[];
  lastChecked: string;
}

export interface TenantComplianceSummary {
  tenantId: string;
  tenantName: string;
  overallStatus: 'compliant' | 'non_compliant' | 'needs_review';
  complianceScore: number;
  totalTemplates: number;
  compliantTemplates: number;
  nonCompliantTemplates: number;
  needsReviewTemplates: number;
  lastChecked: string;
  issues: {
    critical: number;
    warnings: number;
    info: number;
  };
}

export function useAllTenantsCompliance() {
  return useQuery({
    queryKey: ['compliance', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/compliance/tenants');
      return response.data as TenantComplianceSummary[];
    },
  });
}

export function useTenantCompliance(tenantId: string) {
  return useQuery({
    queryKey: ['compliance', 'tenants', tenantId],
    queryFn: async () => {
      const response = await apiClient.get(`/compliance/tenants/${tenantId}`);
      return response.data as TenantComplianceSummary;
    },
    enabled: !!tenantId,
  });
}

export function useTenantTemplatesCompliance(tenantId: string) {
  return useQuery({
    queryKey: ['compliance', 'tenants', tenantId, 'templates'],
    queryFn: async () => {
      const response = await apiClient.get(`/compliance/tenants/${tenantId}/templates`);
      return response.data as ComplianceResult[];
    },
    enabled: !!tenantId,
  });
}

export function useTemplateCompliance(templateId: string) {
  return useQuery({
    queryKey: ['compliance', 'templates', templateId],
    queryFn: async () => {
      const response = await apiClient.get(`/compliance/templates/${templateId}`);
      return response.data as ComplianceResult;
    },
    enabled: !!templateId,
  });
}

