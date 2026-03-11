import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Helper function to convert reason code to display text
const getDisplayReason = (reasonCode: string): string => {
  const map: { [key: string]: string } = {
    'road_accident': 'ROAD ACCIDENT',
    'flooding': 'FLOODING',
    'fire': 'FIRE',
    'medical': 'MEDICAL EMERGENCY',
    'trapped': 'TRAPPED / COLLAPSED STRUCTURE',
    'missing_person': 'MISSING PERSON',
    'other': 'OTHER EMERGENCY',
  };
  return map[reasonCode] || reasonCode.replace(/_/g, ' ').toUpperCase();
};

const DistressSignalScreen = () => {
  const { user, nodeId } = useAuth();
  const [reason, setReason] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDistress, setActiveDistress] = useState<any>(null);

  // Animation for flashing red background
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (activeDistress) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      fadeAnim.setValue(1);
    }
    return () => animation?.stop();
  }, [activeDistress]);

  // Fetch active distress for current user
  const fetchActiveDistress = async () => {
    try {
      const response = await api.get('/api/distress/my-active');
      setActiveDistress(response.data);
    } catch (error) {
      console.error('Failed to fetch active distress:', error);
    }
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchActiveDistress();
    }, [])
  );

  // Also refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchActiveDistress();
      }
    });
    return () => subscription.remove();
  }, []);

  const handleActivate = async () => {
    if (!reason) return;

    setModalVisible(false);
    setLoading(true);

    try {
      const response = await api.post('/api/distress', {
        reason,
        nodeId: nodeId,
      });

      setActiveDistress(response.data.distress);
      Alert.alert('Distress Activated', 'Your distress signal has been sent.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to activate distress.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Distress',
      'Are you sure you want to cancel this distress signal?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/api/distress/${activeDistress.id}/cancel`);
              setActiveDistress(null);
              Alert.alert('Canceled', 'Distress signal has been canceled.');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel distress.');
            }
          },
        },
      ]
    );
  };

  if (activeDistress) {
    // Active distress view with flashing background
    return (
      <MainLayout activeTab="distress">
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: fadeAnim.interpolate({
                inputRange: [0.3, 1],
                outputRange: ['#ffcccc', '#ff5555'],
              }),
            },
          ]}
        >
          <View style={styles.activeCard}>
            <Ionicons name="warning" size={64} color="#8b0000" />
            <Text style={styles.activeTitle}>DISTRESS ACTIVE</Text>
            <Text style={styles.activeReason}>
              Emergency: {getDisplayReason(activeDistress.reason)}
            </Text>
            <Text style={styles.activeTime}>
              Activated: {new Date(activeDistress.timestamp).toLocaleString()}
            </Text>

            <TouchableOpacity
              style={styles.cancelActiveButton}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={24} color="#fff" />
              <Text style={styles.cancelActiveText}>CANCEL DISTRESS</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Rescuers have been notified. Stay calm and await assistance.
            </Text>
          </View>
        </Animated.View>
      </MainLayout>
    );
  }

  // Normal form view
  return (
    <MainLayout activeTab="distress">
      <View style={styles.container}>
        <WelcomeCard />

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name="warning-outline" size={22} color="#d32f2f" />
            <Text style={styles.title}>Activate Distress Signal</Text>
          </View>

          <Text style={styles.description}>
            This will broadcast your emergency situation to all mesh nodes.
            Your name, phone number, and location (based on the connected node)
            will be shared with connected users.
          </Text>

          <Text style={styles.label}>
            Select Emergency Type <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={reason}
              onValueChange={(value) => setReason(value)}
              style={styles.picker}
              enabled={!loading}
            >
              <Picker.Item label="Select reason..." value="" />
              <Picker.Item label="Road Accident" value="road_accident" />
              <Picker.Item label="Flooding" value="flooding" />
              <Picker.Item label="Fire" value="fire" />
              <Picker.Item label="Medical Emergency" value="medical" />
              <Picker.Item label="Trapped / Collapsed Structure" value="trapped" />
              <Picker.Item label="Missing Person" value="missing_person" />
              <Picker.Item label="Other Emergency" value="other" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.activateButton,
            (!reason || loading) && styles.disabledButton,
          ]}
          disabled={!reason || loading}
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.activateText}>
            {loading ? 'Activating...' : 'Continue to Activate'}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Ionicons
                name="warning"
                size={42}
                color="#d32f2f"
                style={{ marginBottom: 10 }}
              />

              <Text style={styles.modalTitle}>Confirm Distress Signal</Text>

              <Text style={styles.modalText}>
                Are you sure you want to activate this distress signal? This
                action will immediately notify nearby users and responders.
              </Text>

              <Text style={styles.modalReason}>
                Emergency Type: <Text style={{ fontWeight: '700' }}>{getDisplayReason(reason)}</Text>
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleActivate}
                >
                  <Text style={styles.confirmText}>Activate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f2b8b8',
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  required: {
    color: '#d32f2f',
  },
  dropdownWrapper: {
    borderWidth: 1,
    borderColor: '#1e88e5',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  disabledButton: {
    backgroundColor: '#e0a0a0',
  },
  activateText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Active distress styles
  activeCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  activeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8b0000',
    marginVertical: 10,
  },
  activeReason: {
    fontSize: 20,
    color: '#8b0000',
    marginBottom: 8,
  },
  activeTime: {
    fontSize: 14,
    color: '#8b0000',
    marginBottom: 30,
  },
  cancelActiveButton: {
    flexDirection: 'row',
    backgroundColor: '#8b0000',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  cancelActiveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 14,
    color: '#8b0000',
    textAlign: 'center',
    marginTop: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalReason: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  cancelText: {
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#d32f2f',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default DistressSignalScreen;