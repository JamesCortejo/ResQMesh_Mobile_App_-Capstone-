import React, { useState, useEffect, useRef, useCallback } from 'react';
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

type DistressRecord = {
  id: number | string;
  reason?: string | null;
  timestamp?: string | null;
  user_code?: string | null;
};

const getDisplayReason = (reasonCode?: string | null): string => {
  if (!reasonCode || typeof reasonCode !== 'string') {
    return 'UNKNOWN EMERGENCY';
  }

  const map: Record<string, string> = {
    road_accident: 'ROAD ACCIDENT',
    flooding: 'FLOODING',
    fire: 'FIRE',
    medical: 'MEDICAL EMERGENCY',
    trapped: 'TRAPPED / COLLAPSED STRUCTURE',
    missing_person: 'MISSING PERSON',
  };

  return map[reasonCode] || reasonCode.replace(/_/g, ' ').toUpperCase();
};

const normalizeDistress = (data: any): DistressRecord | null => {
  if (!data || typeof data !== 'object') return null;

  const id = data.id ?? data.distress_id ?? data.distressId;
  if (id === undefined || id === null) return null;

  return {
    id,
    reason: typeof data.reason === 'string' ? data.reason : null,
    timestamp:
      typeof data.timestamp === 'string'
        ? data.timestamp
        : typeof data.created_at === 'string'
        ? data.created_at
        : null,
    user_code:
      typeof data.user_code === 'string'
        ? data.user_code
        : typeof data.userCode === 'string'
        ? data.userCode
        : null,
  };
};

const safeDate = (ts?: string | null) => {
  try {
    if (!ts) return 'Unknown time';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Invalid time';
    return d.toLocaleString();
  } catch {
    return 'Invalid time';
  }
};

const DistressSignalScreen = () => {
  const { user, nodeId } = useAuth();

  const [reason, setReason] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDistress, setActiveDistress] = useState<DistressRecord | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // 🔥 FIXED ANIMATION
  useEffect(() => {
    if (activeDistress) {
      animationRef.current?.stop();

      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.45,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      animationRef.current = anim;
      anim.start();
    } else {
      animationRef.current?.stop();
      animationRef.current = null;
      pulseAnim.setValue(1);
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [activeDistress]);

  // 🔥 FIXED FETCH LOOP
  const fetchActiveDistress = useCallback(async () => {
    if (!nodeId) return;

    try {
      const response = await api.get(`/api/distress/node-active?nodeId=${nodeId}`);
      const payload = response.data?.distress ?? response.data;
      const normalized = normalizeDistress(payload);

      setActiveDistress((prev) => {
        if (!normalized && !prev) return null;
        if (prev?.id === normalized?.id) return prev;
        return normalized;
      });
    } catch (error) {
      console.error('Failed to fetch active distress:', error);
      setActiveDistress(null);
    }
  }, [nodeId]);

  useFocusEffect(
    useCallback(() => {
      if (!activeDistress) {
        fetchActiveDistress();
      }
    }, [fetchActiveDistress, activeDistress])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !activeDistress) {
        fetchActiveDistress();
      }
    });

    return () => subscription.remove();
  }, [fetchActiveDistress, activeDistress]);

  const handleActivate = async () => {
    if (!reason || !nodeId || loading) return;

    setModalVisible(false);
    setLoading(true);

    try {
      const response = await api.post('/api/distress', {
        reason,
        nodeId,
      });

      const payload = response.data?.distress ?? response.data;
      const normalized = normalizeDistress(payload);

      if (normalized) {
        setActiveDistress(normalized);
        setTimeout(() => {
          Alert.alert('Distress Activated', 'Your distress signal has been sent.');
        }, 50);
      } else {
        Alert.alert('Error', 'Invalid distress data received.');
      }
    } catch (error: any) {
      if (error?.response?.status === 409) {
        Alert.alert(
          'Distress Active',
          'Another distress signal is already active on this node.'
        );
      } else {
        Alert.alert(
          'Error',
          error?.response?.data?.error || 'Failed to activate distress.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeDistress?.id) return;

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
              Alert.alert('Canceled', 'Distress signal canceled.');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to cancel distress.');
            }
          },
        },
      ]
    );
  };

  if (activeDistress) {
    return (
      <MainLayout activeTab="distress">
        <View style={[styles.container, styles.activeContainer]}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.flashOverlay,
              { opacity: pulseAnim },
            ]}
          />

          <View style={styles.activeCard}>
            <Ionicons name="warning" size={64} color="#8b0000" />

            <Text style={styles.activeTitle}>DISTRESS ACTIVE</Text>

            <Text style={styles.activeReason}>
              Emergency: {getDisplayReason(activeDistress.reason)}
            </Text>

            <Text style={styles.activeTime}>
              Activated: {safeDate(activeDistress.timestamp)}
            </Text>

            {activeDistress.user_code &&
              user?.code &&
              activeDistress.user_code === user.code && (
                <TouchableOpacity
                  style={styles.cancelActiveButton}
                  onPress={handleCancel}
                >
                  <Ionicons name="close-circle-outline" size={24} color="#fff" />
                  <Text style={styles.cancelActiveText}>CANCEL DISTRESS</Text>
                </TouchableOpacity>
              )}

            <Text style={styles.note}>
              Rescuers have been notified. Stay calm.
            </Text>
          </View>
        </View>
      </MainLayout>
    );
  }

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
            Broadcast your emergency to nearby mesh nodes.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#1e88e5" />
            <Text style={styles.infoText}>
              This will alert nearby devices and responders connected to the mesh network.
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#8b0000" />
            <Text style={styles.warningText}>
              Misuse of this feature may lead to serious consequences.
            </Text>
          </View>

          <Text style={styles.label}>
            Select Emergency Type <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={reason}
              onValueChange={(v) => setReason(v)}
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
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.activateButton,
            (!reason || loading) && styles.disabledButton,
          ]}
          disabled={!reason || loading}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.activateText}>
            {loading ? 'Sending Signal...' : 'Proceed to Activation'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Only use this feature during real emergencies.
        </Text>

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirm Distress</Text>
              <Text style={styles.modalText}>Activate distress signal?</Text>

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

  activeContainer: {
    backgroundColor: '#ffcccc',
  },

  flashOverlay: {
    backgroundColor: '#ff5555',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f2b8b8',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  description: {
    fontSize: 14,
    color: '#555',
    marginVertical: 10,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },

  infoText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#0d47a1',
    flex: 1,
  },

  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fdecea',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },

  warningText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#8b0000',
    flex: 1,
    fontWeight: '500',
  },

  label: {
    fontWeight: '600',
    marginTop: 10,
  },

  required: {
    color: '#d32f2f',
  },

  dropdownWrapper: {
    borderWidth: 1,
    borderColor: '#1e88e5',
    borderRadius: 10,
    overflow: 'hidden',
  },

  picker: {
    height: 50,
    color: '#111',
  },

  activateButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  disabledButton: {
    backgroundColor: '#e0a0a0',
  },

  activateText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },

  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },

  activeCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8b0000',
    marginTop: 12,
  },

  activeReason: {
    fontSize: 20,
    color: '#8b0000',
    marginVertical: 10,
  },

  activeTime: {
    fontSize: 14,
    color: '#8b0000',
    marginBottom: 30,
  },

  cancelActiveButton: {
    flexDirection: 'row',
    backgroundColor: '#8b0000',
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
  },

  cancelActiveText: {
    color: '#fff',
    marginLeft: 8,
  },

  note: {
    marginTop: 20,
    color: '#8b0000',
  },

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
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  modalText: {
    marginVertical: 10,
    textAlign: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  cancelButton: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginRight: 12,
  },

  confirmButton: {
    padding: 10,
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },

  confirmText: {
    color: '#fff',
  },

  cancelText: {
    fontWeight: '600',
  },
});

export default DistressSignalScreen;