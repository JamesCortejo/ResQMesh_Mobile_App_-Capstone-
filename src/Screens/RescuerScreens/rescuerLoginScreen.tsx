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
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

type ModalType = 'success' | 'error' | 'info';

const RescuerLoginScreen: React.FC<Props> = ({ navigation }) => {
  const [rescuerId, setRescuerId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<ModalType>('info');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  const { signIn } = useAuth();

  const showModal = (
    title: string,
    message: string,
    type: ModalType = 'info',
    onConfirm?: () => void
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalAction(() => onConfirm ?? null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    const action = modalAction;
    setModalAction(null);
    action?.();
  };

  const handleLogin = async () => {
    setError('');

    if (!rescuerId.trim() || !password.trim()) {
      setError('Please fill in all fields');
      showModal('Missing Fields', 'Please fill in all fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const statusRes = await api.get('/api/status', { timeout: 3000 });
      const nodeId = statusRes.data.node_id;

      await signIn({ phone: rescuerId, password, nodeId }, 'rescuer', remember);

      showModal('Login Successful', 'Welcome, Rescuer!', 'success', () => {
        navigation.replace('RescuerMainTabs');
      });
    } catch (err: any) {
      const message = err?.message || 'Login failed. Please check your credentials.';
      setError(message);
      showModal('Login Failed', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Rescuer Login</Text>
          <Text style={styles.subtitle}>Authorized personnel only</Text>

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
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              modalType === 'success'
                ? styles.successAccent
                : modalType === 'error'
                ? styles.errorAccent
                : styles.infoAccent,
            ]}
          >
            <Ionicons
              name={
                modalType === 'success'
                  ? 'checkmark-circle'
                  : modalType === 'error'
                  ? 'close-circle'
                  : 'information-circle'
              }
              size={52}
              color={
                modalType === 'success'
                  ? '#2e7d32'
                  : modalType === 'error'
                  ? '#d32f2f'
                  : '#fb4f00'
              }
            />

            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalText}>{modalMessage}</Text>

            <TouchableOpacity style={styles.modalPrimaryButton} onPress={closeModal}>
              <Text style={styles.modalPrimaryButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoid: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', color: '#111', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#777', marginBottom: 32 },
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  modalTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  modalText: {
    marginTop: 8,
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
  modalPrimaryButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#fb4f00',
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  successAccent: {
    borderTopWidth: 5,
    borderTopColor: '#2e7d32',
  },
  errorAccent: {
    borderTopWidth: 5,
    borderTopColor: '#d32f2f',
  },
  infoAccent: {
    borderTopWidth: 5,
    borderTopColor: '#fb4f00',
  },
});

export default RescuerLoginScreen;