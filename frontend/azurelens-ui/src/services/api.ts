import axios from 'axios';
import { AzureCredentials, AzureResource, CostData, SecurityRecommendation, AlertRule, AKSService, AKSPod, SecureScore, JiraSettings, CreateJiraTicketRequest, JiraTicketResponse } from '../types';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;
