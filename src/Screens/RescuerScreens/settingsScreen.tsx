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
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 👈 import
import { RootStackParamList } from '../../navigations/appNavigations';

type SettingsNavProp = StackNavigationProp<RootStackParamList, 'RescuerSettings'>;

const RescuerSettingsScreen = memo(() => {
  const navigation = useNavigation<SettingsNavProp>();
  const insets = useSafeAreaInsets(); // 👈 get insets
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogoutPress = () => setLogoutModalVisible(true);
  const cancelLogout = () => setLogoutModalVisible(false);
  const confirmLogout = () => {
    setLogoutModalVisible(false);
    navigation.replace('Welcome');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12 }, // 👈 add top inset + extra spacing
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* BACK BUTTON - now safely below status bar */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fb4f00" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>Rescuer Settings</Text>

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
        <Text style={styles.itemText}>Rescuer ID: R-7A3F2B</Text>
      </View>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

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
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    // paddingTop is now applied dynamically from insets
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#fb4f00',
    marginLeft: 6,
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
    marginBottom: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 14,
    color: '#111',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
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

export default RescuerSettingsScreen;