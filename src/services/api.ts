import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_MESH_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('📡 MESH API AUTH HEADER ATTACHED');
    } else {
      console.log('📡 MESH API NO TOKEN FOUND');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('⚠️ MESH API 401, removing stored accessToken');
      await AsyncStorage.removeItem('accessToken');
    }
    return Promise.reject(error);
  }
);

export default api;