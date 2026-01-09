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
