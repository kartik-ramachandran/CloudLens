export interface SubscriptionInfo {
  subscriptionId: string;
  displayName: string;
  state: string;
  tenantId: string;
}

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionIds?: string[];
  subscriptions?: SubscriptionInfo[];
  sessionId?: string;
}

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  subscriptionId: string;
  resourceGroup: string;
  tags?: Record<string, string>;
}

export interface CostData {
  subscriptionId: string;
  subscriptionName: string;
  totalCost: number;
  currency: string;
  startDate: string;
  endDate: string;
  costsByService?: CostByService[];
  monthlyCosts?: MonthlyCost[];
}

export interface CostByService {
  serviceName: string;
  cost: number;
}

export interface MonthlyCost {
  month: string;
  cost: number;
  currency: string;
}

export interface ResourceCostData {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceGroup: string;
  totalCost: number;
  currency: string;
  startDate: string;
  endDate: string;
  monthlyCosts?: MonthlyCost[];
}

export interface SecurityRecommendation {
  id: string;
  name: string;
  displayName: string;
  description: string;
  severity: string;
  status: string;
  resourceId: string;
  category: string;
  remediationSteps?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: string;
  isEnabled: boolean;
  condition: string;
  targetResourceId: string;
  targetResourceName: string;
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
  actionGroups: string[];
  lastModifiedTime?: string;
}

export interface AKSService {
  clusterName: string;
  namespace: string;
  serviceName: string;
  type: string;
  clusterIP: string;
  externalIPs: string[];
  ports: ServicePort[];
  status: string;
  createdAt?: string;
  labels: Record<string, string>;
  selectors: Record<string, string>;
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
  ingresses: IngressInfo[];
}

export interface ServicePort {
  name: string;
  protocol: string;
  port: number;
  targetPort?: number;
  nodePort?: number;
}

export interface IngressInfo {
  name: string;
  namespace: string;
  className: string;
  hosts: string[];
  rules: IngressRule[];
  address: string;
  annotations: Record<string, string>;
}

export interface IngressRule {
  host: string;
  paths: IngressPath[];
}

export interface IngressPath {
  path: string;
  pathType: string;
  serviceName: string;
  servicePort: number;
}

export interface AKSPod {
  clusterName: string;
  namespace: string;
  podName: string;
  status: string;
  readyContainers: number;
  totalContainers: number;
  restartCount: number;
  nodeName: string;
  podIP: string;
  createdAt?: string;
  containers: ContainerStatus[];
  labels: Record<string, string>;
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
}

export interface ContainerStatus {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
  stateReason: string;
}

export interface SecureScore {
  subscriptionId: string;
  subscriptionName: string;
  currentScore: number;
  maxScore: number;
  percentage: number;
  healthyResourcesCount: number;
  unhealthyResourcesCount: number;
  notApplicableResourcesCount: number;
  controls: SecureScoreControl[];
  lastRefreshed?: string;
}

export interface SecureScoreControl {
  controlName: string;
  displayName: string;
  currentScore: number;
  maxScore: number;
  percentage: number;
  healthyResourcesCount: number;
  unhealthyResourcesCount: number;
  description: string;
  remediationSteps: string;
}

export interface JiraSettings {
  id?: number;
  isEnabled: boolean;
  jiraUrl: string;
  username: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateJiraTicketRequest {
  summary: string;
  description: string;
  priority?: string;
  labels?: string[];
}

export interface JiraTicketResponse {
  success: boolean;
  ticketKey?: string;
  ticketUrl?: string;
  message?: string;
}

// FinOps Types
export interface AdvisorRecommendation {
  id: string;
  name: string;
  category: string;
  impact: string;
  shortDescription: string;
  longDescription: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  subscriptionId: string;
  annualSavingsAmount?: number;
  savingsCurrency?: string;
  recommendedAction?: string;
  currentSku?: string;
  recommendedSku?: string;
}

export interface WastedResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceGroup: string;
  subscriptionId: string;
  subscriptionName: string;
  wasteReason: string;
  estimatedMonthlyCost: number;
  currency: string;
  recommendation: string;
  severity: string;
}

export interface TagComplianceReport {
  subscriptionId: string;
  subscriptionName: string;
  totalResources: number;
  taggedResources: number;
  untaggedResources: number;
  tagCoveragePercent: number;
  requiredTags: string[];
  violations: TagViolation[];
}

export interface TagViolation {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceGroup: string;
  missingTags: string[];
}

export interface BudgetData {
  budgetId: string;
  budgetName: string;
  subscriptionId: string;
  budgetAmount: number;
  currentSpend: number;
  forecastedSpend: number;
  currency: string;
  timePeriod: string;
  utilizationPercent: number;
  alerts: BudgetAlert[];
}

export interface BudgetAlert {
  alertType: string;
  threshold: number;
  contactEmails: string;
  isBreached: boolean;
}

export interface CostAnomaly {
  subscriptionId: string;
  subscriptionName: string;
  serviceName: string;
  resourceGroup: string;
  detectedDate: string;
  expectedCost: number;
  actualCost: number;
  costDelta: number;
  percentageIncrease: number;
  severity: string;
  possibleCause: string;
  currency: string;
}

export interface CostForecast {
  subscriptionId: string;
  subscriptionName: string;
  currentMonthActual: number;
  currentMonthForecast: number;
  nextMonthForecast: number;
  next3MonthForecast: number;
  currency: string;
  forecastPoints: MonthlyForecastPoint[];
  trendPercentage: number;
  trendDirection: string;
}

export interface MonthlyForecastPoint {
  month: string;
  amount: number;
  isActual: boolean;
  currency: string;
}

export interface RightsizingRecommendation {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  subscriptionId: string;
  currentSku: string;
  recommendedSku: string;
  estimatedMonthlySavings: number;
  currency: string;
  justification: string;
  impact: string;
  migrationSteps: string;
}

export interface FinOpsMetrics {
  totalWaste: number;
  currency: string;
  wastedResourceCount: number;
  tagCoveragePercent: number;
  potentialMonthlySavings: number;
  advisorRecommendationCount: number;
  topWastedResources: WastedResource[];
  topAdvisorRecommendations: AdvisorRecommendation[];
  recentAnomalies: CostAnomaly[];
  generatedAt: string;
}

// SOC2 / Compliance Types
export interface Soc2Control {
  controlId: string;
  tscCategory: string;
  name: string;
  description: string;
  status: string;
  subscriptionId: string;
  evidenceCount: number;
  passedChecks: number;
  failedChecks: number;
  totalChecks: number;
  compliancePercent: number;
  aiNarrative: string;
  evidence: ComplianceEvidence[];
  gaps: ControlGap[];
  lastEvaluated?: string;
}

export interface ComplianceEvidence {
  evidenceId: string;
  controlId: string;
  subscriptionId: string;
  resourceId: string;
  resourceName: string;
  evidenceType: string;
  title: string;
  summary: string;
  isPassing: boolean;
  rawData: string;
  collectedAt: string;
}

export interface ControlGap {
  controlId: string;
  gapDescription: string;
  severity: string;
  remediationSteps: string;
  owner: string;
  targetDate?: string;
  status: string;
  resourceId: string;
}

export interface ComplianceReport {
  reportId: string;
  reportType: string;
  subscriptionId: string;
  subscriptionName: string;
  periodStart: string;
  periodEnd: string;
  overallStatus: string;
  totalControls: number;
  compliantControls: number;
  nonCompliantControls: number;
  partialControls: number;
  overallCompliancePercent: number;
  controls: Soc2Control[];
  executiveSummary: string;
  generatedAt: string;
}

export interface Soc2ControlDefinition {
  controlId: string;
  tscCategory: string;
  name: string;
  description: string;
  azureEvidenceTypes: string[];
}

// === SOC2 Extended Types ===

export interface RbacAccessReview {
  subscriptionId: string;
  principalId: string;
  principalName: string;
  principalType: string;
  roleDefinitionName: string;
  scope: string;
  isPrivileged: boolean;
  isGuest: boolean;
  isStale: boolean;
  lastActivityDate?: string;
}

export interface AccessReviewSummary {
  totalAssignments: number;
  ownerCount: number;
  contributorCount: number;
  readerCount: number;
  privilegedCount: number;
  guestCount: number;
  staleCount: number;
  assignments: RbacAccessReview[];
  privilegedUsers: RbacAccessReview[];
  guestUsers: RbacAccessReview[];
  staleAccounts: RbacAccessReview[];
  generatedAt: string;
}

export interface ActivityLogEvent {
  eventId: string;
  operationName: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceGroup: string;
  subscriptionId: string;
  caller: string;
  status: string;
  eventTimestamp: string;
  category: string;
  description: string;
  isWrite: boolean;
  isDelete: boolean;
}

export interface ChangeManagementReportData {
  events: ActivityLogEvent[];
  totalChanges: number;
  writeOperations: number;
  deleteOperations: number;
  topActors: string[];
  generatedAt: string;
}

export interface RemediationItem {
  id: number;
  controlId: string;
  gapDescription: string;
  severity: string;
  owner: string;
  targetDate: string;
  status: string;
  subscriptionId: string;
  resourceId: string;
  remediationSteps: string;
  jiraTicketKey?: string;
  jiraTicketUrl?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  notes: string;
}

export interface RemediationItemDto {
  controlId: string;
  gapDescription: string;
  severity: string;
  owner: string;
  targetDate: string;
  status: string;
  subscriptionId: string;
  resourceId: string;
  remediationSteps: string;
  notes: string;
}

export interface ServiceHealthEvent {
  eventId: string;
  title: string;
  serviceName: string;
  region: string;
  status: string;
  eventType: string;
  startTime: string;
  endTime?: string;
  summary: string;
  level: string;
}

export interface BackupStatusItem {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  subscriptionId: string;
  resourceGroup: string;
  hasBackup: boolean;
  lastBackupTime?: string;
  vaultName?: string;
  backupStatus: string;
}

export interface AvailabilityReport {
  serviceHealthEvents: ServiceHealthEvent[];
  backupStatuses: BackupStatusItem[];
  resourcesWithBackup: number;
  resourcesWithoutBackup: number;
  backupCoveragePercent: number;
  activeIncidents: number;
  generatedAt: string;
}

export interface VulnerabilityItem {
  assessmentId: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  subscriptionId: string;
  resourceGroup: string;
  cveId: string;
  title: string;
  description: string;
  severity: string;
  cvssScore: number;
  status: string;
  remediationDescription: string;
  discoveredAt: string;
  category: string;
}

export interface VulnerabilityReport {
  vulnerabilities: VulnerabilityItem[];
  critical: number;
  high: number;
  medium: number;
  low: number;
  totalUnremediated: number;
  generatedAt: string;
}

export interface NsgRuleRisk {
  nsgId: string;
  nsgName: string;
  resourceGroup: string;
  subscriptionId: string;
  ruleName: string;
  direction: string;
  sourceAddressPrefix: string;
  destinationPortRange: string;
  protocol: string;
  access: string;
  priority: number;
  riskLevel: string;
  riskDescription: string;
}

export interface PublicIpExposure {
  resourceId: string;
  resourceName: string;
  ipAddress: string;
  subscriptionId: string;
  resourceGroup: string;
  associatedTo: string;
  isAttached: boolean;
  allocationMethod: string;
}

export interface NetworkSecurityReport {
  riskyNsgRules: NsgRuleRisk[];
  publicIps: PublicIpExposure[];
  criticalRules: number;
  highRiskRules: number;
  unattachedPublicIps: number;
  internetExposedPorts: number;
  generatedAt: string;
}

export interface ReadinessCheckItem {
  checkId: string;
  category: string;
  title: string;
  description: string;
  status: string;
  weight: number;
  recommendation: string;
  azureService: string;
  controlReference: string;
}

export interface Soc2ReadinessReport {
  checks: ReadinessCheckItem[];
  readinessScore: number;
  overallScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  partialChecks: number;
  readinessLevel: string;
  criticalGaps: string[];
  quickWins: string[];
  generatedAt: string;
}

// SOC Incident Management Types
export interface SocIncident {
  id: number;
  incidentId: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  currentTier: string;
  detectedAt: string;
  resolvedAt?: string;
  subscriptionId: string;
  resourceId: string;
  resourceType: string;
  sourceAlert: string;
  assignedTo?: string;
  jiraTicketKey?: string;
  escalationCount: number;
  lastEscalatedAt?: string;
  notes: string;
  attempts: RemediationAttempt[];
}

export interface RemediationAttempt {
  id: number;
  incidentId: number;
  tier: string;
  remediationType: string;
  status: string;
  attemptedAt: string;
  completedAt?: string;
  errorMessage?: string;
  actionsTaken: string;
  isAutomated: boolean;
  performedBy?: string;
}

export interface SocDashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  soc1Incidents: number;
  soc2Incidents: number;
  soc3Incidents: number;
  autoRemediatedToday: number;
  escalatedToday: number;
  avgResolutionTimeHours: number;
  autoRemediationSuccessRate: number;
  recentIncidents: SocIncident[];
  topRemediationTypes: TopRemediationType[];
}

export interface TopRemediationType {
  type: string;
  count: number;
  successCount: number;
}

// Vanta Types
export interface VantaSettings {
  id?: number;
  apiToken: string;
  organizationId: string;
  isEnabled: boolean;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  syncResources: boolean;
  syncCompliance: boolean;
  syncFinOps: boolean;
  isConfigured?: boolean;
  lastModified?: string;
}

export interface VantaSyncStatus {
  lastResourceSync?: string;
  lastEvidenceSync?: string;
  lastTestSync?: string;
  resourcesSyncedLastRun: number;
  evidenceItemsSyncedLastRun: number;
  testResultsSyncedLastRun: number;
  lastSyncStatus: string;
  lastErrorMessage?: string;
  isSyncing: boolean;
}

export interface VantaSyncResult {
  success: boolean;
  status: string;
  resourcesSynced: number;
  evidenceItemsSynced: number;
  testResultsSynced: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// AI Remediation Types
export interface RemediationSuggestion {
  issueType: string;
  title: string;
  description: string;
  rootCause: string;
  remediationSteps: string[];
  automation: 'Automated' | 'SemiAutomated' | 'Manual';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  timeEstimate: string;
  resourcesAffected: string[];
  azureCliCommands: string[];
  powerShellCommands: string[];
  complianceImpact: string;
  references: string[];
}

export interface ComplianceIssue {
  controlId: string;
  controlName: string;
  description: string;
  severity: string;
  status: string;
  resourceId: string;
  resourceType: string;
}

export interface AIRemediationRequest {
  sessionId?: string;
  complianceType: string;
  subscriptionId?: string;
  issues: ComplianceIssue[];
}

export interface AIRemediationResponse {
  success: boolean;
  suggestions: RemediationSuggestion[];
  metadata: {
    timestamp: string;
    totalSuggestions: number;
    automatedCount: number;
    semiAutomatedCount: number;
    manualCount: number;
  };
}

// Cost Alerts
export interface CostAlertRule {
  id: number;
  name: string;
  description: string;
  alertType: 'DailyCost' | 'MonthlyCost' | 'ResourceCost' | 'ServiceCost';
  thresholdAmount: number;
  currency: string;
  thresholdOperator: 'GreaterThan' | 'LessThan' | 'Equal' | 'GreaterThanOrEqual' | 'LessThanOrEqual';
  subscriptionId?: string;
  resourceType?: string;
  resourceGroup?: string;
  serviceName?: string;
  checkFrequency: 'Hourly' | 'Daily' | 'Weekly';
  isEnabled: boolean;
  notificationEmail: string;
  sendJiraTicket: boolean;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdBy: string;
  sessionId: string;
}

export interface CostAlertHistory {
  id: number;
  alertRuleId: number;
  alertRuleName: string;
  actualAmount: number;
  thresholdAmount: number;
  currency: string;
  subscriptionId: string;
  resourceType?: string;
  resourceGroup?: string;
  serviceName?: string;
  status: 'Triggered' | 'Resolved' | 'Acknowledged';
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  emailSent: boolean;
  jiraTicketCreated: boolean;
  jiraTicketKey?: string;
  details: string;
  alertRule?: CostAlertRule;
}

export interface CostAlertRuleDto {
  name: string;
  description: string;
  alertType: string;
  thresholdAmount: number;
  currency: string;
  thresholdOperator: string;
  subscriptionId?: string;
  resourceType?: string;
  resourceGroup?: string;
  serviceName?: string;
  checkFrequency: string;
  isEnabled: boolean;
  notificationEmail: string;
  sendJiraTicket: boolean;
  sessionId: string;
}
