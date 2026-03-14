import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigations/appNavigations';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

type RescuerLoginNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RescuerLogin'
>;

interface Props {
  navigation: RescuerLoginNavigationProp;
}

const RescuerLoginScreen: React.FC<Props> = ({ navigation }) => {
  const [rescuerId, setRescuerId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();

  const handleLogin = async () => {
    setError('');

    if (!rescuerId.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Get the node ID from the status endpoint
      const statusRes = await api.get('/api/status', { timeout: 3000 });
      const nodeId = statusRes.data.node_id;

      await signIn({ phone: rescuerId, password, nodeId }, 'rescuer', remember);
      Alert.alert(
        'Login Successful',
        'Welcome, Rescuer!',
        [{ text: 'OK', onPress: () => navigation.replace('RescuerMainTabs') }]
      );
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Rescuer Login</Text>
        <Text style={styles.subtitle}>Authorized personnel only</Text>

        {error !== '' && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#d32f2f" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={[styles.inputContainer, error && !rescuerId && styles.inputError]}>
          <Ionicons name="id-card-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Rescuer ID / Phone"
            placeholderTextColor="#666"
            value={rescuerId}
            onChangeText={(text) => {
              setRescuerId(text);
              setError('');
            }}
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={[styles.inputContainer, error && !password && styles.inputError]}>
          <Ionicons name="lock-closed-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            editable={!loading}
          />
        </View>

        <View style={styles.rememberContainer}>
          <Text style={styles.rememberText}>Remember me</Text>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ false: '#ccc', true: '#fb4f00' }}
            thumbColor="#fff"
            disabled={loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', color: '#111', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#777', marginBottom: 32 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111' },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberText: { fontSize: 14, color: '#555' },
  loginButton: {
    backgroundColor: '#fb4f00',
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#fdae7a',
  },
  loginText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});

export default RescuerLoginScreen;