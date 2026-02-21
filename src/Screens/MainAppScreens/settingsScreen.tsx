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

const SettingsScreen = memo(() => {
  const rootNavigation = useRootNavigation();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogoutPress = () => setLogoutModalVisible(true);
  const cancelLogout = () => setLogoutModalVisible(false);

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    // ✅ Correctly replace the whole root stack with Welcome
    rootNavigation.replace('Welcome');
  };

  return (
    <MainLayout activeTab="settings">
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ACCOUNT & ROLE */}
        <Text style={styles.sectionTitle}>Account & Role</Text>
        <View style={styles.card}>
          <Text style={styles.item}>Current Role: User</Text>
          <Text style={styles.subText}>Role is selected during login</Text>
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
  container: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    fontSize: 14,
    color: '#111',
  },
  subText: {
    fontSize: 12,
    color: '#777',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  confirmButton: {
    backgroundColor: '#d32f2f',
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;