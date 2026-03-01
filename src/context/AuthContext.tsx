import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface AuthContextData {
  user: any | null;
  loading: boolean;
  signIn(
    credentials: { phone: string; password: string; nodeId?: string },
    role: 'civilian' | 'rescuer',
    remember?: boolean
  ): Promise<void>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      console.log('🔍 AuthContext: loading storage data...');
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('accessToken');
        console.log('🔍 storedUser:', storedUser);
        console.log('🔍 storedToken:', storedToken ? '***present***' : 'null');
        
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          api.defaults.headers.Authorization = `Bearer ${storedToken}`;
          console.log('✅ AuthContext: user restored from storage', parsedUser);
        } else {
          console.log('ℹ️ AuthContext: no stored credentials');
        }
      } catch (error) {
        console.error('❌ AuthContext: error loading storage', error);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const signIn = async (
    credentials: { phone: string; password: string; nodeId?: string },
    role: 'civilian' | 'rescuer',
    remember: boolean = true
  ) => {
    const endpoint = role === 'civilian' ? '/auth/civilian/login' : '/auth/rescuer/login';
    console.log(`🔑 signIn called with role: ${role}, endpoint: ${endpoint}, remember: ${remember}, nodeId: ${credentials.nodeId}`);

    try {
      const response = await api.post(endpoint, {
        phone: credentials.phone,
        password: credentials.password,
        nodeId: credentials.nodeId, // Include nodeId in request
      });
      const { access_token, user: userData } = response.data;
      console.log('✅ Login successful, token:', access_token);

      setUser(userData);
      api.defaults.headers.Authorization = `Bearer ${access_token}`;

      if (remember) {
        await AsyncStorage.setItem('accessToken', access_token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        console.log('💾 AuthContext: token and user saved to AsyncStorage');
      } else {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('user');
        console.log('🧹 AuthContext: cleared any existing stored credentials');
      }
    } catch (error: any) {
      console.error('❌ signIn error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const signOut = async () => {
    console.log('🚪 signOut called');
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('user');
    setUser(null);
    delete api.defaults.headers.Authorization;
    console.log('✅ AuthContext: user signed out, storage cleared');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};