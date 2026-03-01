import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigations/appNavigations';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LoadingOverlay from '../../components/LoadingOverlay'; // 👈 new

type SettingsNavProp = StackNavigationProp<RootStackParamList, 'RescuerSettings'>;

const RescuerSettingsScreen = memo(() => {
  const navigation = useNavigation<SettingsNavProp>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loading, setLoading] = useState(false); // 👈 new

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
      navigation.replace('Welcome');
    }
  };

  if (!user) return null;

  return (
    <>
      <LoadingOverlay visible={loading} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* BACK BUTTON */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fb4f00" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Rescuer Settings</Text>

        {/* ACCOUNT INFO */}
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{`${user.firstName} ${user.lastName}`}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Rescuer Code:</Text>
            <Text style={styles.value}>{user.code}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{user.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{user.age || 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{user.address || 'Not provided'}</Text>
          </View>
        </View>

        {/* OPERATIONAL */}
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

        {/* NOTIFICATIONS */}
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

        {/* TEAM */}
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

        {/* SYSTEM */}
        <Text style={styles.sectionTitle}>System</Text>
        <View style={styles.card}>
          <Text style={styles.itemText}>App Version: 1.0.0</Text>
          <Text style={styles.itemText}>Mesh Protocol: v1</Text>
          <Text style={styles.itemText}>Node Firmware: v1.2</Text>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* LOGOUT MODAL */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f6' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backText: { fontSize: 16, color: '#fb4f00', marginLeft: 6, fontWeight: '500' },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 14, color: '#777', fontWeight: '500' },
  value: { fontSize: 14, color: '#111', fontWeight: '500' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemText: { fontSize: 14, color: '#111' },
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

export default RescuerSettingsScreen;