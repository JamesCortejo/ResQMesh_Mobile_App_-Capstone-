import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const proxyApi = axios.create({
  baseURL: 'http://192.168.4.1:5000/api/proxy',
  timeout: 15000,
});

proxyApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default proxyApi;