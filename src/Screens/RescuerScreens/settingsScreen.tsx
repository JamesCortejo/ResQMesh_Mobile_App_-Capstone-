import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigations/appNavigations';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import cloudApi from '../../services/cloudApi';
import LoadingOverlay from '../../components/LoadingOverlay';

type SettingsNavProp = StackNavigationProp<RootStackParamList, 'RescuerSettings'>;

const RescuerSettingsScreen = memo(() => {
  const navigation = useNavigation<SettingsNavProp>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogoutPress = () => setLogoutModalVisible(true);
  const cancelLogout = () => setLogoutModalVisible(false);

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('accessToken');
      console.log('LOGOUT TOKEN:', token);

      if (token) {
        await Promise.allSettled([
          cloudApi.post(
            '/auth/logout',
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          api.post(
            '/auth/logout',
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);
      } else {
        console.log('⚠️ No token found during logout');
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await signOut();
      setLoading(false);
      navigation.replace('Welcome');
    }
  };

  if (!user) return null;

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'N/A';

  return (
    <>
      <LoadingOverlay visible={loading} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fb4f00" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Rescuer Settings</Text>

        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.card}>
          <InfoRow label="Name" value={fullName} />
          <InfoRow label="Rescuer Code" value={user.code} />
          <InfoRow label="Phone" value={user.phone} />
          <InfoRow label="Age" value={user.age !== null && user.age !== undefined ? String(user.age) : null} />
          <InfoRow label="Occupation" value={user.occupation} />
          <InfoRow label="Address" value={user.address} />
        </View>

        <Text style={styles.sectionTitle}>Team Assignment</Text>
        <View style={styles.card}>
          <InfoRow label="Team" value={user.teamName} />
          <InfoRow label="Team ID" value={user.teamId !== null && user.teamId !== undefined ? String(user.teamId) : null} />
        </View>

        <Text style={styles.sectionTitle}>Operational</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.itemText}>Equipment Status</Text>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.itemText}>Shift Log</Text>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.itemText}>Emergency Codes</Text>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.itemText}>Distress Alerts</Text>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.itemText}>Mesh Network Updates</Text>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Team</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.itemText}>Rescuer Roster</Text>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.itemText}>Command Center</Text>
            <Ionicons name="chevron-forward" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>System</Text>
        <View style={styles.card}>
          <Text style={styles.itemText}>App Version: 1.0.0</Text>
          <Text style={styles.itemText}>Mesh Protocol: v1</Text>
          <Text style={styles.itemText}>Node Firmware: v1.2</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

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
    </>
  );
});

// Reusable info row with consistent N/A fallback
const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={[styles.value, !value && styles.valueEmpty]}>
      {value || 'N/A'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f6' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backText: { fontSize: 16, color: '#fb4f00', marginLeft: 6, fontWeight: '500' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: { fontSize: 14, color: '#777', fontWeight: '500' },
  value: { fontSize: 14, color: '#111', fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  valueEmpty: { color: '#bbb', fontStyle: 'italic' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: { fontSize: 14, color: '#111' },
  logoutButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: { backgroundColor: '#f1f1f1' },
  confirmButton: { backgroundColor: '#d32f2f' },
  cancelButtonText: { color: '#555', fontSize: 14, fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default RescuerSettingsScreen;