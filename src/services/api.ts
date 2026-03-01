import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL of your Orange Pi Flask server (hotspot IP)
const BASE_URL = 'http://192.168.4.1:5000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration (optional)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid – clear token and redirect to login
      await AsyncStorage.removeItem('accessToken');
      // You could emit an event to reset navigation, but we'll handle it per screen
    }
    return Promise.reject(error);
  }
);

export default api;