import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
} from 'react-native';
import MainLayout from '../../layouts/MainLayout';
import { useRootNavigation } from '../../hooks/useRootNavigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LoadingOverlay from '../../components/LoadingOverlay';

const SettingsScreen = memo(() => {
  const rootNavigation = useRootNavigation();
  const { user, signOut } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Log user for debugging (optional)
  console.log('SettingsScreen user:', user);

  const handleLogoutPress = () => setLogoutModalVisible(true);
  const cancelLogout = () => setLogoutModalVisible(false);

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await signOut();
      setLoading(false);
      rootNavigation.replace('Welcome');
    }
  };

  if (!user) return null;

  return (
    <MainLayout activeTab="settings">
      <LoadingOverlay visible={loading} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ACCOUNT INFO */}
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{`${user.firstName} ${user.lastName}`}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>User Code:</Text>
            <Text style={styles.value}>{user.code}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Role:</Text>
            <Text style={styles.value}>Civilian</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{user.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{user.age ? String(user.age) : 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{user.address || 'Not provided'}</Text>
          </View>
        </View>

        {/* MESH NETWORK */}
        <Text style={styles.sectionTitle}>Mesh Network</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.item}>Auto-connect to strongest node</Text>
            <Switch value />
          </View>
          <View style={styles.row}>
            <Text style={styles.item}>Allow node switching</Text>
            <Switch value />
          </View>
        </View>

        {/* COMMUNICATION */}
        <Text style={styles.sectionTitle}>Communication</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.item}>Enable voice messages</Text>
            <Switch value />
          </View>
          <Text style={styles.subText}>
            Voice messages are limited to 10–15 seconds
          </Text>
        </View>

        {/* DISTRESS & EMERGENCY */}
        <Text style={styles.sectionTitle}>Distress & Emergency</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.item}>Require confirmation before distress</Text>
            <Switch value />
          </View>
          <View style={styles.row}>
            <Text style={styles.item}>Share location with distress</Text>
            <Switch value />
          </View>
        </View>

        {/* MAP & LOCATION */}
        <Text style={styles.sectionTitle}>Map & Location</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.item}>Show node numbers</Text>
            <Switch value />
          </View>
          <View style={styles.row}>
            <Text style={styles.item}>Show rescuer locations</Text>
            <Switch value />
          </View>
        </View>

        {/* ABOUT SYSTEM */}
        <Text style={styles.sectionTitle}>About System</Text>
        <View style={styles.card}>
          <Text style={styles.item}>App Version: 1.0.0</Text>
          <Text style={styles.item}>Mesh Protocol: v1</Text>
          <Text style={styles.item}>Node Firmware: v1.2</Text>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={logoutModalVisible}
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelLogout}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
});

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  label: { fontSize: 14, color: '#777', fontWeight: '500' },
  value: { fontSize: 14, color: '#111', fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  item: { fontSize: 14, color: '#111' },
  subText: { fontSize: 12, color: '#777' },
  logoutButton: { backgroundColor: '#d32f2f', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 6 },
  cancelButton: { backgroundColor: '#f1f1f1' },
  confirmButton: { backgroundColor: '#d32f2f' },
  cancelButtonText: { color: '#555', fontSize: 14, fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default SettingsScreen;