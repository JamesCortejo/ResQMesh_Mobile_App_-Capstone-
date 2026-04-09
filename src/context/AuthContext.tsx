import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import api from '../services/api';
import cloudApi from '../services/cloudApi';

type AuthRole = 'civilian' | 'rescuer';

interface SignInCredentials {
  phone?: string;
  code?: string;
  password: string;
  nodeId?: string;
}

interface AuthUser {
  id?: number;
  code?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  age?: number | null;
  occupation?: string | null;
  bloodType?: string | null;
  address?: string | null;
  role?: string;
  teamId?: number | null;
  teamName?: string | null;
  phone?: string | null;
  phoneHash?: string | null;
  passwordHash?: string | null;
  [key: string]: any;
}

interface AuthContextData {
  user: AuthUser | null;
  loading: boolean;
  nodeId: string | null;
  signIn(
    credentials: SignInCredentials,
    role: AuthRole,
    remember?: boolean
  ): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_KEYS = {
  token: 'accessToken',
  user: 'user',
  nodeId: 'nodeId',
  passwordHash: 'password_hash',
};

const normalizeUser = (user: any): AuthUser => {
  if (!user || typeof user !== 'object') return {};

  return {
    ...user,
    id: user.id ?? user.user_id ?? undefined,
    code: user.code ?? user.user_code ?? undefined,
    firstName: user.firstName ?? user.first_name ?? undefined,
    middleName: user.middleName ?? user.middle_name ?? null,
    lastName: user.lastName ?? user.last_name ?? undefined,
    age: user.age ?? null,
    occupation: user.occupation ?? null,
    bloodType: user.bloodType ?? user.blood_type ?? null,
    address: user.address ?? user.address_encrypted ?? null,
    role: user.role ?? 'civilian',
    teamId: user.teamId ?? user.team_id ?? user.team?.id ?? null,
    teamName: user.teamName ?? user.team_name ?? user.team?.name ?? null,
    phone: user.phone ?? user.phone_encrypted ?? null,
    phoneHash: user.phoneHash ?? user.phone_hash ?? null,
    passwordHash: user.passwordHash ?? user.password_hash ?? null,
  };
};

const getPasswordHash = (user: any): string => {
  return user?.passwordHash ?? user?.password_hash ?? user?.password?.hash ?? '';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodeId, setNodeId] = useState<string | null>(null);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const [storedUser, storedToken, storedNodeId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.user),
          AsyncStorage.getItem(STORAGE_KEYS.token),
          AsyncStorage.getItem(STORAGE_KEYS.nodeId),
        ]);

        console.log('🟣 STORAGE LOAD: user exists =', !!storedUser);
        console.log('🟣 STORAGE LOAD: token exists =', !!storedToken);
        console.log('🟣 STORAGE LOAD: nodeId =', storedNodeId);

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('🟣 STORAGE LOAD: stored user =', JSON.stringify(parsedUser, null, 2));
          setUser(normalizeUser(parsedUser));
        }

        if (storedToken) {
          console.log('🟣 STORAGE LOAD: applying token to axios defaults');
          api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
          cloudApi.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
        }

        if (storedNodeId) {
          setNodeId(storedNodeId);
        }
      } catch (error) {
        console.error('❌ AuthContext: error loading storage', error);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, []);

  const saveSession = async (
    accessToken: string,
    userData: any,
    remember: boolean,
    currentNodeId?: string
  ) => {
    const normalizedUser = normalizeUser(userData);
    const passwordHash = getPasswordHash(userData);

    console.log('🔥 LOGIN TOKEN:', accessToken);
    console.log('🔥 REMEMBER FLAG:', remember);
    console.log('🟢 NORMALIZED USER:');
    console.log(JSON.stringify(normalizedUser, null, 2));
    console.log('🟢 RAW USER DATA:');
    console.log(JSON.stringify(userData, null, 2));
    console.log('🟢 TEAM ID:', normalizedUser.teamId);
    console.log('🟢 TEAM NAME:', normalizedUser.teamName);

    setUser(normalizedUser);
    setNodeId(currentNodeId ?? null);

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    cloudApi.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    if (remember) {
      const items: [string, string][] = [
        [STORAGE_KEYS.token, accessToken],
        [STORAGE_KEYS.user, JSON.stringify(normalizedUser)],
      ];

      if (currentNodeId) {
        items.push([STORAGE_KEYS.nodeId, currentNodeId]);
      }

      if (passwordHash) {
        items.push([STORAGE_KEYS.passwordHash, passwordHash]);
      }

      console.log('🔥 SAVING TOKEN TO STORAGE:', accessToken);
      console.log('🔥 SAVING USER TO STORAGE:', JSON.stringify(normalizedUser, null, 2));
      console.log('🔥 SAVING NODE ID TO STORAGE:', currentNodeId ?? null);

      await AsyncStorage.multiSet(items);

      const checkToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
      console.log('🔥 TOKEN AFTER SAVE:', checkToken);
    } else {
      console.log('⚠️ remember=false, clearing stored session data');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.token,
        STORAGE_KEYS.user,
        STORAGE_KEYS.nodeId,
        STORAGE_KEYS.passwordHash,
      ]);
    }
  };

  const signIn = async (
    credentials: SignInCredentials,
    role: AuthRole,
    remember: boolean = true
  ) => {
    const endpoint =
      role === 'civilian'
        ? '/auth/civilian/login'
        : '/auth/rescuer/login';

    const payload =
      role === 'rescuer'
        ? {
            code: credentials.code?.trim() || credentials.phone?.trim() || '',
            password: credentials.password,
            nodeId: credentials.nodeId,
          }
        : {
            phone: credentials.phone?.trim() || '',
            password: credentials.password,
            nodeId: credentials.nodeId,
          };

    console.log('🟦 SIGN IN START');
    console.log('🟦 ROLE:', role);
    console.log('🟦 ENDPOINT:', endpoint);
    console.log('🟦 PAYLOAD:', JSON.stringify(payload, null, 2));

    if (role === 'civilian') {
      try {
        const response = await api.post(endpoint, payload);
        console.log('🟦 CIVILIAN LOGIN RESPONSE:', JSON.stringify(response.data, null, 2));

        const { access_token, user: userData } = response.data || {};

        console.log('🟦 CIVILIAN TOKEN:', access_token);
        console.log('🟦 CIVILIAN USER:', JSON.stringify(userData, null, 2));

        if (!access_token || !userData) {
          throw new Error('Invalid mesh login response');
        }

        await saveSession(access_token, userData, remember, credentials.nodeId);
        return;
      } catch (meshError: any) {
        console.log(
          '⚠️ Civilian mesh login failed, trying offline...',
          meshError?.response?.data || meshError?.message
        );
      }

      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);
      const storedHash = (await AsyncStorage.getItem(STORAGE_KEYS.passwordHash)) || '';

      console.log('🟦 OFFLINE CIVILIAN: storedUser exists =', !!storedUser);
      console.log('🟦 OFFLINE CIVILIAN: storedHash exists =', !!storedHash);

      if (!storedUser || !storedHash) {
        throw new Error('No offline credentials available');
      }

      const parsedUser = normalizeUser(JSON.parse(storedUser));
      const isMatch = await bcrypt.compare(credentials.password, storedHash);

      if (!isMatch) {
        throw new Error('Wrong password');
      }

      setUser(parsedUser);

      const storedNodeId = await AsyncStorage.getItem(STORAGE_KEYS.nodeId);
      setNodeId(storedNodeId ?? null);

      delete api.defaults.headers.common.Authorization;
      delete cloudApi.defaults.headers.common.Authorization;
      return;
    }

    try {
      const response = await cloudApi.post(endpoint, payload);

      console.log('🔵 RESCUER CLOUD LOGIN RESPONSE:');
      console.log(JSON.stringify(response.data, null, 2));

      const { access_token, user: userData } = response.data || {};

      console.log('🔵 CLOUD TOKEN:', access_token);
      console.log('🔵 CLOUD USER OBJECT:');
      console.log(JSON.stringify(userData, null, 2));
      console.log('🔵 CLOUD TEAM FIELD:', userData?.team);
      console.log('🔵 CLOUD TEAM NAME:', userData?.team?.name);

      if (!access_token || !userData) {
        throw new Error('Invalid cloud login response');
      }

      await saveSession(access_token, userData, remember, credentials.nodeId);
      return;
    } catch (cloudError: any) {
      console.log(
        '⚠️ Cloud login failed, trying mesh...',
        cloudError?.response?.data || cloudError?.message
      );
    }

    try {
      const response = await api.post(endpoint, payload);

      console.log('🟡 RESCUER MESH LOGIN RESPONSE:');
      console.log(JSON.stringify(response.data, null, 2));

      const { access_token, user: userData } = response.data || {};

      console.log('🟡 MESH TOKEN:', access_token);
      console.log('🟡 MESH USER OBJECT:');
      console.log(JSON.stringify(userData, null, 2));
      console.log('🟡 MESH TEAM FIELD:', userData?.team);
      console.log('🟡 MESH TEAM NAME:', userData?.team?.name);

      if (!access_token || !userData) {
        throw new Error('Invalid mesh login response');
      }

      await saveSession(access_token, userData, remember, credentials.nodeId);
      return;
    } catch (meshError: any) {
      console.log(
        '⚠️ Mesh login failed, trying offline...',
        meshError?.response?.data || meshError?.message
      );
    }

    const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);
    const storedHash = (await AsyncStorage.getItem(STORAGE_KEYS.passwordHash)) || '';

    console.log('🟡 OFFLINE RESCUER: storedUser exists =', !!storedUser);
    console.log('🟡 OFFLINE RESCUER: storedHash exists =', !!storedHash);

    if (!storedUser || !storedHash) {
      throw new Error('No offline credentials available');
    }

    const parsedUser = normalizeUser(JSON.parse(storedUser));
    const isMatch = await bcrypt.compare(credentials.password, storedHash);

    if (!isMatch) {
      throw new Error('Wrong password');
    }

    setUser(parsedUser);

    const storedNodeId = await AsyncStorage.getItem(STORAGE_KEYS.nodeId);
    setNodeId(storedNodeId ?? null);

    delete api.defaults.headers.common.Authorization;
    delete cloudApi.defaults.headers.common.Authorization;
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.token,
      STORAGE_KEYS.user,
      STORAGE_KEYS.nodeId,
      STORAGE_KEYS.passwordHash,
    ]);

    setUser(null);
    setNodeId(null);

    delete api.defaults.headers.common.Authorization;
    delete cloudApi.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider value={{ user, loading, nodeId, signIn, signOut }}>
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