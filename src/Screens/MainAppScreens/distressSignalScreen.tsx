import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';

const DistressSignalScreen = () => {
  const [reason, setReason] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const handleActivate = () => {
    setModalVisible(true);
  };

  const confirmActivation = () => {
    setModalVisible(false);

    // 🚨 TODO: trigger actual distress signal logic here
    console.log('Distress signal activated:', reason);
  };

  return (
    <MainLayout activeTab="distress">
      <View style={styles.container}>
        <WelcomeCard />

        {/* Distress Card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name="warning-outline" size={22} color="#d32f2f" />
            <Text style={styles.title}>Activate Distress Signal</Text>
          </View>

          <Text style={styles.description}>
            This will broadcast your emergency situation to all mesh
            nodes. Your name, phone number, and location will be shared
            with connected users.
          </Text>

          <Text style={styles.label}>
            Select Emergency Type <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={reason}
              onValueChange={(value) => setReason(value)}
              style={styles.picker}
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

        {/* Activate Button */}
        <TouchableOpacity
          style={[
            styles.activateButton,
            !reason && styles.disabledButton,
          ]}
          disabled={!reason}
          activeOpacity={0.85}
          onPress={handleActivate}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.activateText}>Continue to Activate</Text>
        </TouchableOpacity>

        {/* 🔔 CONFIRMATION MODAL */}
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

              <Text style={styles.modalTitle}>
                Confirm Distress Signal
              </Text>

              <Text style={styles.modalText}>
                Are you sure you want to activate this distress signal?
                This action will immediately notify nearby users and
                responders.
              </Text>

              <Text style={styles.modalReason}>
                Emergency Type: <Text style={{ fontWeight: '700' }}>{reason}</Text>
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
                  onPress={confirmActivation}
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

  /* MODAL STYLES */
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
