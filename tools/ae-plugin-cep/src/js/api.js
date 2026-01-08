import axios from 'axios';

const API_BASE_URL = 'http://localhost:4001';
const API_TIMEOUT = 10000;

// Axios instance with configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request Interceptor (e.g., for Auth Token)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor (Error Handling)
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API Functions
export async function queryServer(endpoint, params = {}) {
  try {
    const response = await apiClient.get(endpoint, { params });
    return response;
  } catch (error) {
    throw new Error(`Query failed: ${error.message}`);
  }
}

export async function sendData(endpoint, data) {
  try {
    const response = await apiClient.post(endpoint, data);
    return response;
  } catch (error) {
    throw new Error(`Send failed: ${error.message}`);
  }
}

export async function searchScenes(query) {
  try {
    const response = await apiClient.get('/api/search', {
      params: { q: query, limit: 20 }
    });
    return response;
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}

export async function healthCheck() {
  try {
    const response = await apiClient.get('/api/health');
    return response;
  } catch (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }
}

export async function uploadFile(endpoint, file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await apiClient.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

// Get API config
export function getApiConfig() {
  return {
    baseURL: localStorage.getItem('serverUrl') || API_BASE_URL,
    timeout: API_TIMEOUT
  };
}

// Update API config
export function updateApiConfig(config) {
  if (config.serverUrl) {
    localStorage.setItem('serverUrl', config.serverUrl);
    apiClient.defaults.baseURL = config.serverUrl;
  }
  if (config.apiToken) {
    localStorage.setItem('authToken', config.apiToken);
  }
}

// Set default base URL
export function setBaseURL(url) {
  localStorage.setItem('serverUrl', url);
  apiClient.defaults.baseURL = url;
}

