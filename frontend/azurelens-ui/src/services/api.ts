import axios from 'axios';
import {
  AzureCredentials, AzureResource, CostData, SecurityRecommendation, AlertRule, AKSService, AKSPod, SecureScore,
  JiraSettings, CreateJiraTicketRequest, JiraTicketResponse,
  FinOpsMetrics, WastedResource, AdvisorRecommendation, RightsizingRecommendation, CostAnomaly, CostForecast, BudgetData, TagComplianceReport,
  ComplianceReport, Soc2Control, ComplianceEvidence, ControlGap, Soc2ControlDefinition,
  VantaSettings, VantaSyncStatus, VantaSyncResult,
  AccessReviewSummary, ChangeManagementReportData, RemediationItem, RemediationItemDto,
  AvailabilityReport, VulnerabilityReport, NetworkSecurityReport, Soc2ReadinessReport
} from '../types';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      localStorage.removeItem('azureSession');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const connectToAzure = async (credentials: AzureCredentials) => {
  const response = await api.post('/azure/connect', credentials);
  return response.data;
};

export const getAzureResources = async (credentials: AzureCredentials, forceRefresh: boolean = false): Promise<AzureResource[]> => {
  const response = await api.post(`/azure/resources?forceRefresh=${forceRefresh}`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getAzureCosts = async (credentials: AzureCredentials, forceRefresh: boolean = false): Promise<CostData[]> => {
  const response = await api.post(`/azure/costs?forceRefresh=${forceRefresh}`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getSecurityRecommendations = async (credentials: AzureCredentials): Promise<SecurityRecommendation[]> => {
  const response = await api.post('/azure/recommendations', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getAIRecommendations = async (context: any): Promise<any[]> => {
  const response = await api.post('/azure/ai-insights', context);
  return response.data;
};

export const getMonthlyCosts = async (credentials: AzureCredentials, startDate: string, endDate: string): Promise<any[]> => {
  const response = await api.post(`/azure/costs/monthly?startDate=${startDate}&endDate=${endDate}`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getResourceCosts = async (credentials: AzureCredentials, startDate: string, endDate: string): Promise<any[]> => {
  const response = await api.post(`/azure/costs/resources?startDate=${startDate}&endDate=${endDate}`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getAlertRules = async (credentials: AzureCredentials): Promise<AlertRule[]> => {
  const response = await api.post('/azure/alerts', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getAKSServices = async (credentials: AzureCredentials): Promise<AKSService[]> => {
  const response = await api.post('/azure/aks/services', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getAKSPods = async (credentials: AzureCredentials): Promise<AKSPod[]> => {
  const response = await api.post('/azure/aks/pods', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getSecureScores = async (credentials: AzureCredentials): Promise<SecureScore[]> => {
  const response = await api.post('/azure/secure-scores', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

// JIRA Integration APIs
export const getJiraSettings = async (): Promise<JiraSettings> => {
  const response = await api.get('/azure/jira/settings');
  return response.data;
};

export const saveJiraSettings = async (settings: JiraSettings): Promise<JiraSettings> => {
  const response = await api.post('/azure/jira/settings', settings);
  return response.data;
};

export const testJiraConnection = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/azure/jira/test-connection');
  return response.data;
};

export const createJiraTicket = async (ticket: CreateJiraTicketRequest): Promise<JiraTicketResponse> => {
  const response = await api.post('/azure/jira/create-ticket', ticket);
  return response.data;
};

export const createJiraTicketFromAlert = async (alertId: string): Promise<JiraTicketResponse> => {
  const response = await api.post('/azure/jira/create-ticket-from-alert', { alertId });
  return response.data;
};

export const createJiraTicketFromSecureScore = async (subscriptionId: string, controlName: string): Promise<JiraTicketResponse> => {
  const response = await api.post('/azure/jira/create-ticket-from-secure-score', { subscriptionId, controlName });
  return response.data;
};

// FinOps APIs
export const getFinOpsMetrics = async (credentials: AzureCredentials): Promise<FinOpsMetrics> => {
  const response = await api.post('/finops/metrics', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getWastedResources = async (credentials: AzureCredentials): Promise<WastedResource[]> => {
  const response = await api.post('/finops/waste', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getAdvisorRecommendations = async (credentials: AzureCredentials, category?: string): Promise<AdvisorRecommendation[]> => {
  const params = category ? `?category=${category}` : '';
  const response = await api.post(`/finops/advisor${params}`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getRightsizingRecommendations = async (credentials: AzureCredentials): Promise<RightsizingRecommendation[]> => {
  const response = await api.post('/finops/rightsizing', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getCostAnomalies = async (credentials: AzureCredentials): Promise<CostAnomaly[]> => {
  const response = await api.post('/finops/anomalies', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getCostForecast = async (credentials: AzureCredentials): Promise<CostForecast[]> => {
  const response = await api.post('/finops/forecast', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getBudgets = async (credentials: AzureCredentials): Promise<BudgetData[]> => {
  const response = await api.post('/finops/budgets', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getTagCompliance = async (credentials: AzureCredentials, requiredTags?: string[]): Promise<TagComplianceReport> => {
  const response = await api.post('/finops/tag-compliance', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    requiredTags
  });
  return response.data;
};

export const getFinOpsAIInsights = async (credentials: AzureCredentials, insightType: string = 'General'): Promise<any[]> => {
  const response = await api.post('/finops/ai-insights', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    insightType
  });
  return response.data;
};

export const applyBulkTags = async (
  credentials: AzureCredentials,
  resourceIds: string[],
  tags: { [key: string]: string },
  replaceExisting: boolean = false
): Promise<any> => {
  const response = await api.post('/finops/apply-bulk-tags', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    resourceIds,
    tags,
    replaceExisting
  });
  return response.data;
};

export const exportTagViolationsCsv = async (credentials: AzureCredentials, requiredTags?: string[]): Promise<Blob> => {
  const response = await api.post('/finops/export-tag-violations', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    requiredTags
  }, {
    responseType: 'blob'
  });
  return response.data;
};

export const getAITagSuggestions = async (credentials: AzureCredentials, resourceIds: string[]): Promise<any[]> => {
  const response = await api.post('/finops/ai-tag-suggestions', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    resourceIds
  });
  return response.data;
};

// Compliance / SOC2 APIs
export const getSoc2ControlDefinitions = async (): Promise<Soc2ControlDefinition[]> => {
  const response = await api.get('/compliance/soc2/control-definitions');
  return response.data;
};

export const getSoc2Controls = async (credentials: AzureCredentials): Promise<Soc2Control[]> => {
  const response = await api.post('/compliance/soc2/controls', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const collectComplianceEvidence = async (credentials: AzureCredentials): Promise<{ count: number; evidence: ComplianceEvidence[] }> => {
  const response = await api.post('/compliance/soc2/evidence/collect', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getComplianceGaps = async (credentials: AzureCredentials): Promise<ControlGap[]> => {
  const response = await api.post('/compliance/soc2/gaps', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const generateSoc2Report = async (credentials: AzureCredentials, reportType: string = 'SOC2TypeI', includeAi: boolean = true): Promise<ComplianceReport> => {
  const response = await api.post('/compliance/soc2/report', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    reportType,
    includeAiNarratives: includeAi
  });
  return response.data;
};

export const exportSoc2Report = async (credentials: AzureCredentials, format: string = 'excel'): Promise<Blob> => {
  const response = await api.post(`/compliance/soc2/report/export?format=${format}`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    reportType: 'SOC2TypeI',
    includeAiNarratives: true
  }, { responseType: 'blob' });
  return response.data;
};

export const getAuditLog = async (page: number = 1, pageSize: number = 50): Promise<any[]> => {
  const response = await api.get(`/compliance/audit-log?page=${page}&pageSize=${pageSize}`);
  return response.data;
};

// Vanta APIs
export const getVantaSettings = async (): Promise<VantaSettings> => {
  const response = await api.get('/vanta/settings');
  return response.data;
};

export const saveVantaSettings = async (settings: VantaSettings): Promise<{ success: boolean; message: string; isConfigured: boolean }> => {
  const response = await api.post('/vanta/settings', settings);
  return response.data;
};

export const testVantaConnection = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/vanta/test-connection');
  return response.data;
};

export const triggerVantaSync = async (credentials: AzureCredentials, syncType: string = 'Full'): Promise<VantaSyncResult> => {
  const response = await api.post('/vanta/sync', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    syncType
  });
  return response.data;
};

export const getVantaSyncStatus = async (): Promise<VantaSyncStatus> => {
  const response = await api.get('/vanta/sync-status');
  return response.data;
};

// SOC2 Extended APIs
export const getAccessReviewSummary = async (credentials: AzureCredentials) => {
  const response = await api.post('/AccessReview/summary', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getChangeManagementReport = async (credentials: AzureCredentials, days: number = 30) => {
  const response = await api.post('/ChangeManagement/report', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    days
  });
  return response.data;
};

export const getRemediationItems = async (credentials: AzureCredentials) => {
  const response = await api.post('/Remediation', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const createRemediationItem = async (item: any) => {
  const response = await api.post('/Remediation/create', item);
  return response.data;
};

export const updateRemediationItem = async (id: number, item: any) => {
  const response = await api.put(`/Remediation/${id}`, item);
  return response.data;
};

export const deleteRemediationItem = async (id: number) => {
  const response = await api.delete(`/Remediation/${id}`);
  return response.data;
};

export const createJiraTicketForRemediation = async (id: number) => {
  const response = await api.post(`/Remediation/${id}/jira-ticket`);
  return response.data;
};

export const getAvailabilityReport = async (credentials: AzureCredentials) => {
  const response = await api.post('/Availability/report', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getVulnerabilityReport = async (credentials: AzureCredentials) => {
  const response = await api.post('/Vulnerability/report', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getNetworkSecurityReport = async (credentials: AzureCredentials) => {
  const response = await api.post('/NetworkSecurity/report', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getReadinessAssessment = async (credentials: AzureCredentials) => {
  const response = await api.post('/Compliance/soc2/readiness', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

// SOC Incident Management APIs
export const getSocDashboardStats = async (credentials: AzureCredentials) => {
  const response = await api.post('/SocIncident/dashboard', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const getSocIncidents = async (credentials: AzureCredentials, tier?: string, status?: string) => {
  const response = await api.post('/SocIncident/incidents', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    tier,
    status
  });
  return response.data;
};

export const getSocIncidentById = async (credentials: AzureCredentials, id: number) => {
  const response = await api.post(`/SocIncident/incident/${id}`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const createSocIncident = async (incident: any) => {
  const response = await api.post('/SocIncident/create', incident);
  return response.data;
};

export const processSoc1Remediation = async (credentials: AzureCredentials, incidentId: number) => {
  const response = await api.post(`/SocIncident/incident/${incidentId}/remediate-soc1`, {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds
  });
  return response.data;
};

export const recordManualRemediation = async (incidentId: number, remediationType: string, actionsTaken: string, success: boolean) => {
  const response = await api.post(`/SocIncident/incident/${incidentId}/remediate-manual`, {
    remediationType,
    actionsTaken,
    success
  });
  return response.data;
};

export const escalateSocIncident = async (incidentId: number, reason: string, assignedTo?: string) => {
  const response = await api.post(`/SocIncident/incident/${incidentId}/escalate`, {
    incidentId,
    reason,
    assignedTo
  });
  return response.data;
};

export const closeSocIncident = async (incidentId: number, resolution: string) => {
  const response = await api.post(`/SocIncident/incident/${incidentId}/close`, {
    resolution
  });
  return response.data;
};

// ========== AI Remediation APIs ==========

export const generateAIRemediationSuggestions = async (credentials: AzureCredentials, issues: any[], complianceType: string = 'SOC2') => {
  const response = await api.post('/ai-remediation/suggestions', {
    sessionId: credentials.sessionId,
    complianceType,
    subscriptionId: credentials.subscriptionIds?.[0],
    issues
  });
  return response.data;
};

export const generateSingleRemediationSuggestion = async (
  credentials: AzureCredentials,
  controlId: string,
  controlName: string,
  description: string,
  severity: string,
  resourceId?: string,
  resourceType?: string,
  complianceType: string = 'SOC2'
) => {
  const response = await api.post('/ai-remediation/suggest-single', {
    sessionId: credentials.sessionId,
    complianceType,
    controlId,
    controlName,
    description,
    severity,
    subscriptionId: credentials.subscriptionIds?.[0],
    resourceId,
    resourceType
  });
  return response.data;
};

// Export APIs
export const exportResources = async (credentials: AzureCredentials, format: 'excel' | 'html' | 'csv' = 'excel'): Promise<Blob> => {
  const response = await api.post('/export/resources', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    format: format === 'excel' ? 'Excel' : format === 'csv' ? 'CSV' : 'PDF'
  }, { responseType: 'blob' });
  return response.data;
};

export const exportCosts = async (credentials: AzureCredentials, format: 'excel' | 'html' | 'csv' = 'excel'): Promise<Blob> => {
  const response = await api.post('/export/costs', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    format: format === 'excel' ? 'Excel' : format === 'csv' ? 'CSV' : 'PDF'
  }, { responseType: 'blob' });
  return response.data;
};

export const exportRecommendations = async (credentials: AzureCredentials, format: 'excel' | 'html' | 'csv' = 'excel'): Promise<Blob> => {
  const response = await api.post('/export/recommendations', {
    sessionId: credentials.sessionId,
    subscriptionIds: credentials.subscriptionIds,
    format: format === 'excel' ? 'Excel' : format === 'csv' ? 'CSV' : 'PDF'
  }, { responseType: 'blob' });
  return response.data;
};

// ── COST ALERTS API ──

export const getCostAlertRules = async (sessionId: string) => {
  const response = await api.get('/CostAlerts', {
    params: { sessionId }
  });
  return response.data;
};

export const getCostAlertRule = async (id: number) => {
  const response = await api.get(`/CostAlerts/${id}`);
  return response.data;
};

export const createCostAlertRule = async (dto: any) => {
  const response = await api.post('/CostAlerts', dto);
  return response.data;
};

export const updateCostAlertRule = async (id: number, dto: any) => {
  const response = await api.put(`/CostAlerts/${id}`, dto);
  return response.data;
};

export const deleteCostAlertRule = async (id: number) => {
  const response = await api.delete(`/CostAlerts/${id}`);
  return response.data;
};

export const toggleCostAlertRule = async (id: number, isEnabled: boolean) => {
  const response = await api.patch(`/CostAlerts/${id}/toggle`, isEnabled);
  return response.data;
};

export const getCostAlertHistory = async (sessionId: string, alertRuleId?: number, pageSize: number = 50) => {
  const response = await api.get('/CostAlerts/history', {
    params: { sessionId, alertRuleId, pageSize }
  });
  return response.data;
};

export const acknowledgeCostAlert = async (alertId: number, acknowledgedBy?: string) => {
  const response = await api.patch(`/CostAlerts/history/${alertId}/acknowledge`, acknowledgedBy);
  return response.data;
};

export const resolveCostAlert = async (alertId: number) => {
  const response = await api.patch(`/CostAlerts/history/${alertId}/resolve`);
  return response.data;
};

export const evaluateCostAlerts = async () => {
  const response = await api.post('/CostAlerts/evaluate');
  return response.data;
};

export default api;
