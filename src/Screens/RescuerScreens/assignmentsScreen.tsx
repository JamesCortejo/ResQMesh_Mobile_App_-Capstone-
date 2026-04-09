import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import RescuerMainLayout from '../../layouts/RescuerMainLayout';
import cloudApi from '../../services/cloudApi';

type Assignment = {
  id: number;
  distress_id: number;
  status: string;
  assigned_at: string;
  eta_minutes: number | null;
  distress: {
    code: string;
    reason: string;
    latitude: number | null;
    longitude: number | null;
    timestamp: string;
    priority: string;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
      bloodType: string;
      age: number;
    };
  };
  node: {
    id: string;
    name: string;
  };
};

type ModalType = 'success' | 'error' | 'info';

const CACHE_KEY = 'cached_assignments';

const RescuerAssignmentsScreen = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<ModalType>('info');
  const [modalAction, setModalAction] = useState<(() => Promise<void> | void) | null>(null);
  const [modalConfirmText, setModalConfirmText] = useState('OK');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      console.log('🌐 NETWORK STATUS:', online ? 'ONLINE' : 'OFFLINE');
    });

    return () => unsubscribe();
  }, []);

  const showModal = useCallback(
    (
      title: string,
      message: string,
      type: ModalType = 'info',
      onConfirm?: (() => Promise<void> | void) | null,
      confirmText: string = 'OK'
    ) => {
      setModalTitle(title);
      setModalMessage(message);
      setModalType(type);
      setModalAction(() => onConfirm ?? null);
      setModalConfirmText(confirmText);
      setModalVisible(true);
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleModalConfirm = useCallback(async () => {
    const action = modalAction;
    setModalVisible(false);
    setModalAction(null);

    if (!action) return;

    try {
      await action();
    } catch (err) {
      console.error('Modal action failed:', err);
    }
  }, [modalAction]);

  const loadCachedAssignments = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed: Assignment[] = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        setAssignments(parsed);
        return parsed;
      }
      return null;
    } catch (err) {
      console.error('Failed to load cached assignments', err);
      return null;
    }
  }, []);

  const fetchAssignments = useCallback(
    async (silentOfflineNotice = false) => {
      try {
        if (!isOnline) {
          const cached = await loadCachedAssignments();

          if (!silentOfflineNotice) {
            if (cached && cached.length > 0) {
              showModal(
                'Offline Mode',
                'You are offline. Showing cached assignments.',
                'info'
              );
            } else {
              showModal(
                'Offline Mode',
                'You are offline and no cached assignments are available.',
                'error'
              );
            }
          }

          return;
        }

        const res = await cloudApi.get('/api/rescuer/assignments');
        const data: Assignment[] = Array.isArray(res.data) ? res.data : [];

        setAssignments(data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error('Failed to fetch assignments', err);

        const cached = await loadCachedAssignments();

        if (cached && cached.length > 0) {
          setAssignments(cached);
          showModal(
            'Offline Fallback',
            'Could not reach the server. Loaded cached assignments instead.',
            'info'
          );
        } else {
          showModal('Error', 'Could not load assignments', 'error');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOnline, loadCachedAssignments, showModal]
  );

  const resolveAssignment = useCallback(
    (assignmentId: number) => {
      if (!isOnline) {
        showModal(
          'Offline',
          'You cannot resolve assignments while offline.',
          'error'
        );
        return;
      }

      showModal(
        'Resolve Emergency',
        'Mark this emergency as resolved?',
        'info',
        async () => {
          try {
            await cloudApi.post(`/api/assignment/${assignmentId}/resolve`);
            showModal(
              'Success',
              'Emergency marked as resolved',
              'success'
            );
            await fetchAssignments(true);
          } catch (err) {
            console.error('Failed to resolve', err);
            showModal('Error', 'Could not resolve emergency', 'error');
          }
        },
        'Resolve'
      );
    },
    [fetchAssignments, isOnline, showModal]
  );

  useFocusEffect(
    useCallback(() => {
      fetchAssignments(true);
    }, [fetchAssignments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(true);
  };

  const renderAssignment = ({ item }: { item: Assignment }) => {
    const priorityColor =
      item.distress.priority === 'high'
        ? '#d32f2f'
        : item.distress.priority === 'medium'
        ? '#fb4f00'
        : '#2e7d32';

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="warning-outline" size={20} color="#d32f2f" />
            <Text style={styles.distressCode}>{item.distress.code}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityText}>
                {item.distress.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.nodeName}>Node: {item.node.name || item.node.id}</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.reason}>Reason: {item.distress.reason}</Text>
          <Text style={styles.victim}>
            Victim: {item.distress.user.firstName} {item.distress.user.lastName}
          </Text>
          <Text style={styles.phone}>Phone: {item.distress.user.phone}</Text>
          {item.eta_minutes !== null && (
            <Text style={styles.eta}>ETA: {item.eta_minutes} min</Text>
          )}
          <Text style={styles.assignedAt}>
            Assigned: {new Date(item.assigned_at).toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.resolveButton,
            !isOnline && styles.resolveButtonDisabled,
          ]}
          onPress={() => resolveAssignment(item.id)}
          disabled={!isOnline}
        >
          <Text style={styles.resolveText}>
            {isOnline ? 'Mark as Resolved' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <RescuerMainLayout activeTab="assignments">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fb4f00" />
          <Text>Loading assignments...</Text>
        </View>
      </RescuerMainLayout>
    );
  }

  return (
    <RescuerMainLayout activeTab="assignments">
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAssignment}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#aaa" />
            <Text style={styles.emptyText}>No active assignments</Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          assignments.length === 0 && styles.emptyListContent,
        ]}
      />

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

            {modalAction ? (
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSecondaryButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleModalConfirm}
                >
                  <Text style={styles.modalButtonText}>{modalConfirmText}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </RescuerMainLayout>
  );
};

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 24 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  offlineText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  header: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  distressCode: { fontSize: 16, fontWeight: '700', marginLeft: 6, flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  nodeName: { fontSize: 13, color: '#666' },
  details: { marginBottom: 16 },
  reason: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  victim: { fontSize: 13, color: '#333', marginBottom: 2 },
  phone: { fontSize: 13, color: '#333', marginBottom: 2 },
  eta: { fontSize: 13, color: '#fb4f00', fontWeight: '600', marginTop: 4 },
  assignedAt: { fontSize: 11, color: '#999', marginTop: 6 },
  resolveButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  resolveText: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
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
    lineHeight: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 18,
    backgroundColor: '#fb4f00',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSecondaryButton: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalSecondaryButtonText: {
    color: '#333',
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

export default RescuerAssignmentsScreen;