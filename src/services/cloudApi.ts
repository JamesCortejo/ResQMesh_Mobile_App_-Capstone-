import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cloudApi = axios.create({
  baseURL: process.env.EXPO_PUBLIC_CLOUD_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

cloudApi.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🌐 CLOUD API AUTH HEADER ATTACHED');
    } else {
      console.log('🌐 CLOUD API NO TOKEN FOUND');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

cloudApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('⚠️ CLOUD API 401, removing stored accessToken');
      await AsyncStorage.removeItem('accessToken');
    }
    return Promise.reject(error);
  }
);

export default cloudApi;