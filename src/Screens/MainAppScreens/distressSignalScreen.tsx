import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';

import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatLocalTime12hr } from '../../utils/dateHelpers';

type DistressRecord = {
  id: number | string;
  reason?: string | null;
  timestamp?: string | null;
  user_code?: string | null;
};

type MessageModalType = 'success' | 'error' | 'info';

type MessageModalState = {
  visible: boolean;
  title: string;
  message: string;
  type: MessageModalType;
};

const getDisplayReason = (reasonCode?: string | null): string => {
  if (!reasonCode || typeof reasonCode !== 'string') return 'UNKNOWN EMERGENCY';
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
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : null,
    user_code: typeof data.user_code === 'string' ? data.user_code : null,
  };
};

const safeDate = (ts?: string | null) => {
  if (!ts) return 'Unknown time';
  return formatLocalTime12hr(ts);
};

const DistressSignalScreen = () => {
  const { user, nodeId } = useAuth();
  const [reason, setReason] = useState('');
  const [confirmActivateVisible, setConfirmActivateVisible] = useState(false);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [activateCooldown, setActivateCooldown] = useState(0);
  const [cancelCooldown, setCancelCooldown] = useState(0);
  const [activeDistress, setActiveDistress] = useState<DistressRecord | null>(null);
  const [messageModal, setMessageModal] = useState<MessageModalState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const isMounted = useRef(true);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openMessageModal = useCallback(
    (title: string, message: string, type: MessageModalType = 'info') => {
      setMessageModal({ visible: true, title, message, type });
    },
    []
  );

  useEffect(() => {
    isMounted.current = true;
    cooldownIntervalRef.current = setInterval(() => {
      setActivateCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setCancelCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      isMounted.current = false;
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeDistress) setCancelCooldown(15);
  }, [activeDistress?.id]);

  const fetchActiveDistress = useCallback(async () => {
    if (!nodeId) return;
    try {
      const response = await api.get(`/api/distress/node-active?nodeId=${nodeId}`);
      const payload = response.data?.distress ?? response.data;
      const normalized = normalizeDistress(payload);
      if (!isMounted.current) return;
      setActiveDistress((prev) => (prev?.id === normalized?.id ? prev : normalized));
    } catch (error) {
      console.error('Failed to fetch active distress:', error);
      if (isMounted.current) setActiveDistress(null);
    }
  }, [nodeId]);

  useFocusEffect(
    useCallback(() => {
      fetchActiveDistress();
    }, [fetchActiveDistress])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') fetchActiveDistress();
    });
    return () => subscription.remove();
  }, [fetchActiveDistress]);

  const handleActivate = async () => {
    if (!reason || !nodeId || loading || activateCooldown > 0) return;
    setConfirmActivateVisible(false);
    setLoading(true);
    try {
      const response = await api.post('/api/distress', { reason, nodeId });
      if (!isMounted.current) return;
      const payload = response.data?.distress ?? response.data;
      const normalized = normalizeDistress(payload);
      if (normalized) {
        setActiveDistress(normalized);
        setReason('');
        setCancelCooldown(15);
        openMessageModal('Distress Activated', 'Your distress signal has been sent.', 'success');
      } else {
        openMessageModal('Error', 'Invalid distress data received.', 'error');
      }
    } catch (error: any) {
      if (!isMounted.current) return;
      if (error?.response?.status === 409) {
        openMessageModal('Distress Active', 'Another distress signal is already active on this node.', 'error');
      } else {
        openMessageModal('Error', error?.response?.data?.error || 'Failed to activate distress.', 'error');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const cancelDistress = async (id: number | string) => {
    if (cancelCooldown > 0 || canceling) return;
    setCanceling(true);
    try {
      await api.patch(`/api/distress/${id}/cancel`);
      if (!isMounted.current) return;
      setActiveDistress(null);
      setActivateCooldown(15);
      openMessageModal('Canceled', 'Distress signal canceled.', 'success');
    } catch (error) {
      console.error(error);
      if (isMounted.current) openMessageModal('Error', 'Failed to cancel distress.', 'error');
    } finally {
      if (isMounted.current) setCanceling(false);
    }
  };

  const handleCancel = () => {
    if (!activeDistress?.id || cancelCooldown > 0 || canceling) return;
    setConfirmCancelVisible(true);
  };

  const modalIconName =
    messageModal.type === 'success'
      ? 'checkmark-circle'
      : messageModal.type === 'error'
      ? 'close-circle'
      : 'information-circle';
  const modalIconColor =
    messageModal.type === 'success'
      ? '#2e7d32'
      : messageModal.type === 'error'
      ? '#d32f2f'
      : '#1e88e5';
  const modalAccentStyle =
    messageModal.type === 'success'
      ? styles.successAccent
      : messageModal.type === 'error'
      ? styles.errorAccent
      : styles.infoAccent;

  if (activeDistress) {
    return (
      <MainLayout activeTab="distress">
        <View style={[styles.container, styles.activeContainer]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <Image
              source={require('../../assets/pictures/red_glow.gif')}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          </View>
          <View style={styles.activeCard}>
            <Ionicons name="warning" size={64} color="#ffffff" />
            <Text style={styles.activeTitle}>DISTRESS ACTIVE</Text>
            <Text style={styles.activeReason}>Emergency: {getDisplayReason(activeDistress.reason)}</Text>
            <Text style={styles.activeTime}>Activated: {safeDate(activeDistress.timestamp)}</Text>
            {activeDistress.user_code && user?.code && activeDistress.user_code === user.code && (
              <>
                <TouchableOpacity
                  style={[
                    styles.cancelActiveButton,
                    (cancelCooldown > 0 || canceling) && styles.disabledCancelButton,
                  ]}
                  onPress={handleCancel}
                  disabled={cancelCooldown > 0 || canceling}
                >
                  <Ionicons name="close-circle-outline" size={24} color="#fff" />
                  <Text style={styles.cancelActiveText}>
                    {canceling
                      ? 'CANCELING...'
                      : cancelCooldown > 0
                      ? `CANCEL AVAILABLE IN ${cancelCooldown}s`
                      : 'CANCEL DISTRESS'}
                  </Text>
                </TouchableOpacity>
                {cancelCooldown > 0 && (
                  <Text style={styles.cooldownNote}>Please wait before canceling to confirm this is a real emergency.</Text>
                )}
              </>
            )}
            <Text style={styles.note}>Rescuers have been notified. Stay calm.</Text>
          </View>
          <Modal visible={loading} transparent animationType="fade">
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#d32f2f" />
                <Text style={styles.loadingText}>Sending distress signal...</Text>
              </View>
            </View>
          </Modal>
          <Modal visible={confirmCancelVisible} transparent animationType="fade" onRequestClose={() => setConfirmCancelVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, styles.cancelConfirmCard]}>
                <Ionicons name="help-circle" size={52} color="#8b0000" />
                <Text style={styles.modalTitle}>Cancel Distress</Text>
                <Text style={styles.modalText}>Are you sure you want to cancel this distress signal?</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setConfirmCancelVisible(false)}>
                    <Text style={styles.modalSecondaryButtonText}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryButton}
                    onPress={() => {
                      setConfirmCancelVisible(false);
                      void cancelDistress(activeDistress.id);
                    }}
                  >
                    <Text style={styles.modalPrimaryButtonText}>Yes, Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          <Modal visible={messageModal.visible} transparent animationType="fade" onRequestClose={() => setMessageModal((prev) => ({ ...prev, visible: false }))}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, modalAccentStyle]}>
                <Ionicons name={modalIconName as any} size={52} color={modalIconColor} />
                <Text style={styles.modalTitle}>{messageModal.title}</Text>
                <Text style={styles.modalText}>{messageModal.message}</Text>
                <View style={styles.singleModalAction}>
                  <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setMessageModal((prev) => ({ ...prev, visible: false }))}>
                    <Text style={styles.modalPrimaryButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
          <Text style={styles.description}>Broadcast your emergency to nearby mesh nodes.</Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#1e88e5" />
            <Text style={styles.infoText}>This will alert nearby devices and responders connected to the mesh network.</Text>
          </View>
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#8b0000" />
            <Text style={styles.warningText}>Misuse of this feature may lead to serious consequences.</Text>
          </View>
          <Text style={styles.label}>Select Emergency Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={reason}
              onValueChange={(v) => setReason(v)}
              style={styles.picker}
              enabled={!loading && activateCooldown === 0}
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
            (!reason || loading || activateCooldown > 0) && styles.disabledButton,
          ]}
          disabled={!reason || loading || activateCooldown > 0}
          onPress={() => setConfirmActivateVisible(true)}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.activateText}>
            {loading ? 'Sending Signal...' : activateCooldown > 0 ? `WAIT ${activateCooldown}S` : 'Proceed to Activation'}
          </Text>
        </TouchableOpacity>
        {activateCooldown > 0 && <Text style={styles.cooldownNoteNormal}>Please wait before activating again.</Text>}
        <Text style={styles.footerNote}>Only use this feature during real emergencies.</Text>
        <Modal visible={confirmActivateVisible} transparent animationType="fade" onRequestClose={() => setConfirmActivateVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, styles.confirmCard]}>
              <Ionicons name="warning" size={52} color="#d32f2f" />
              <Text style={styles.modalTitle}>Confirm Distress</Text>
              <Text style={styles.modalText}>Activate distress signal?</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setConfirmActivateVisible(false)}>
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalPrimaryButton, (loading || activateCooldown > 0) && styles.disabledModalButton]}
                  onPress={handleActivate}
                  disabled={loading || activateCooldown > 0}
                >
                  <Text style={styles.modalPrimaryButtonText}>Activate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={loading} transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#d32f2f" />
              <Text style={styles.loadingText}>Sending distress signal...</Text>
            </View>
          </View>
        </Modal>
        <Modal visible={messageModal.visible} transparent animationType="fade" onRequestClose={() => setMessageModal((prev) => ({ ...prev, visible: false }))}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, modalAccentStyle]}>
              <Ionicons name={modalIconName as any} size={52} color={modalIconColor} />
              <Text style={styles.modalTitle}>{messageModal.title}</Text>
              <Text style={styles.modalText}>{messageModal.message}</Text>
              <View style={styles.singleModalAction}>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setMessageModal((prev) => ({ ...prev, visible: false }))}>
                  <Text style={styles.modalPrimaryButtonText}>OK</Text>
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
  container: { flex: 1, justifyContent: 'space-between', backgroundColor: '#fff' },
  activeContainer: { backgroundColor: '#ffcccc' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#f2b8b8' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginLeft: 8 },
  description: { fontSize: 14, color: '#555', marginVertical: 10 },
  infoBox: { flexDirection: 'row', backgroundColor: '#e3f2fd', padding: 10, borderRadius: 10, marginTop: 10 },
  infoText: { marginLeft: 8, fontSize: 13, color: '#0d47a1', flex: 1 },
  warningBox: { flexDirection: 'row', backgroundColor: '#fdecea', padding: 10, borderRadius: 10, marginTop: 10 },
  warningText: { marginLeft: 8, fontSize: 13, color: '#8b0000', flex: 1, fontWeight: '500' },
  label: { fontWeight: '600', marginTop: 10 },
  required: { color: '#d32f2f' },
  dropdownWrapper: { borderWidth: 1, borderColor: '#1e88e5', borderRadius: 10, overflow: 'hidden' },
  picker: { height: 50, color: '#111' },
  activateButton: { backgroundColor: '#d32f2f', paddingVertical: 14, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  disabledButton: { backgroundColor: '#e0a0a0', opacity: 0.7 },
  activateText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 10 },
  cooldownNoteNormal: { textAlign: 'center', fontSize: 12, color: '#8b0000', marginTop: 8, marginBottom: 4 },
  activeCard: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  activeTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginTop: 12, textAlign: 'center' },
  activeReason: { fontSize: 20, color: '#ffffff', marginVertical: 10, textAlign: 'center', flexWrap: 'wrap', maxWidth: '90%' },
  activeTime: { fontSize: 14, color: '#ffffff', marginBottom: 30, textAlign: 'center' },
  cancelActiveButton: { flexDirection: 'row', backgroundColor: '#8b0000', padding: 14, borderRadius: 30, alignItems: 'center' },
  disabledCancelButton: { backgroundColor: '#c06060', opacity: 0.7 },
  cancelActiveText: { color: '#fff', marginLeft: 8 },
  note: { marginTop: 20, color: '#ffffff', textAlign: 'center' },
  cooldownNote: { marginTop: 8, fontSize: 12, color: '#ffffff', textAlign: 'center', paddingHorizontal: 20, fontStyle: 'italic' },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  loadingCard: { width: '80%', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#333', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' },
  confirmCard: { borderTopWidth: 5, borderTopColor: '#d32f2f' },
  cancelConfirmCard: { borderTopWidth: 5, borderTopColor: '#8b0000' },
  successAccent: { borderTopWidth: 5, borderTopColor: '#2e7d32' },
  errorAccent: { borderTopWidth: 5, borderTopColor: '#d32f2f' },
  infoAccent: { borderTopWidth: 5, borderTopColor: '#1e88e5' },
  modalTitle: { marginTop: 10, fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center' },
  modalText: { marginTop: 8, fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  singleModalAction: { marginTop: 18, width: '100%', alignItems: 'center' },
  modalSecondaryButton: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#eee', borderRadius: 10, marginRight: 12 },
  modalSecondaryButtonText: { color: '#333', fontWeight: '700' },
  modalPrimaryButton: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#d32f2f', borderRadius: 10 },
  modalPrimaryButtonText: { color: '#fff', fontWeight: '700' },
  disabledModalButton: { backgroundColor: '#e0a0a0', opacity: 0.7 },
});

export default DistressSignalScreen;