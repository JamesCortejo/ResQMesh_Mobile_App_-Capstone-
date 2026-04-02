import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigations/appNavigations';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import LoadingOverlay from '../../components/LoadingOverlay';

type CivilianRegisterNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CivilianRegister'
>;

interface Props {
  navigation: CivilianRegisterNavigationProp;
}

type ModalType = 'success' | 'error' | 'info';

const CivilianRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<ModalType>('info');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);

  const showModal = (
    title: string,
    message: string,
    type: ModalType = 'info',
    onConfirm?: () => void
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalAction(() => onConfirm ?? null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    const action = modalAction;
    setModalAction(null);
    action?.();
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!age.trim()) newErrors.age = 'Age is required';
    else if (isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120)
      newErrors.age = 'Please enter a valid age (1-120)';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^[0-9]{10,12}$/.test(phone.replace(/\D/g, '')))
      newErrors.phone = 'Enter a valid phone number (10-12 digits)';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    return newErrors;
  };

  const handleRegister = async () => {
    setErrors({});
    setGeneralError('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showModal('Validation Error', 'Please fix the highlighted fields and try again.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/civilian/register', {
        firstName,
        middleName,
        lastName,
        age: parseInt(age, 10),
        address,
        phone,
        occupation,
        bloodType,
        password,
      });

      showModal(
        'Registration Successful',
        'Your account has been created. Please log in.',
        'success',
        () => {
          navigation.goBack();
        }
      );
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Registration failed. Please try again.';
      setGeneralError(message);
      showModal('Registration Failed', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Civilian Registration</Text>

          {/* First Name */}
          <View style={[styles.inputContainer, errors.firstName && styles.inputError]}>
            <Ionicons name="person-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              placeholderTextColor="#666"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setErrors((prev) => ({ ...prev, firstName: '' }));
              }}
              editable={!loading}
            />
          </View>
          {errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}

          {/* Middle Name */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Middle Name"
              placeholderTextColor="#666"
              value={middleName}
              onChangeText={setMiddleName}
              editable={!loading}
            />
          </View>

          {/* Last Name */}
          <View style={[styles.inputContainer, errors.lastName && styles.inputError]}>
            <Ionicons name="person-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              placeholderTextColor="#666"
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setErrors((prev) => ({ ...prev, lastName: '' }));
              }}
              editable={!loading}
            />
          </View>
          {errors.lastName && <Text style={styles.fieldError}>{errors.lastName}</Text>}

          {/* Age */}
          <View style={[styles.inputContainer, errors.age && styles.inputError]}>
            <Ionicons name="calendar-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Age *"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={age}
              onChangeText={(text) => {
                setAge(text);
                setErrors((prev) => ({ ...prev, age: '' }));
              }}
              editable={!loading}
            />
          </View>
          {errors.age && <Text style={styles.fieldError}>{errors.age}</Text>}

          {/* Address */}
          <View style={[styles.inputContainer, errors.address && styles.inputError]}>
            <Ionicons name="location-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Address *"
              placeholderTextColor="#666"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setErrors((prev) => ({ ...prev, address: '' }));
              }}
              editable={!loading}
              multiline
            />
          </View>
          {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}

          {/* Phone Number */}
          <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
            <Ionicons name="call-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              editable={!loading}
            />
          </View>
          {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}

          {/* Occupation */}
          <View style={styles.inputContainer}>
            <Ionicons name="briefcase-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Occupation"
              placeholderTextColor="#666"
              value={occupation}
              onChangeText={setOccupation}
              editable={!loading}
            />
          </View>

          {/* Blood Type Dropdown */}
          <View style={styles.pickerContainer}>
            <Ionicons name="water-outline" size={20} color="#777" />
            <Picker
              selectedValue={bloodType}
              onValueChange={(itemValue) => setBloodType(itemValue)}
              style={styles.picker}
              enabled={!loading}
            >
              <Picker.Item label="Select Blood Type" value="" />
              <Picker.Item label="A+" value="A+" />
              <Picker.Item label="A-" value="A-" />
              <Picker.Item label="B+" value="B+" />
              <Picker.Item label="B-" value="B-" />
              <Picker.Item label="AB+" value="AB+" />
              <Picker.Item label="AB-" value="AB-" />
              <Picker.Item label="O+" value="O+" />
              <Picker.Item label="O-" value="O-" />
            </Picker>
          </View>

          {/* Password */}
          <View style={[styles.inputContainer, errors.password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Password *"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors((prev) => ({ ...prev, password: '' }));
              }}
              editable={!loading}
            />
          </View>
          {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

          {/* Confirm Password */}
          <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color="#777" />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              placeholderTextColor="#666"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              editable={!loading}
            />
          </View>
          {errors.confirmPassword && (
            <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.loginLink}>
              Already have an account? <Text style={styles.loginText}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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
                  : '#1e88e5'
              }
            />

            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalText}>{modalMessage}</Text>

            <TouchableOpacity style={styles.modalPrimaryButton} onPress={closeModal}>
              <Text style={styles.modalPrimaryButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoid: { flex: 1 },
  container: { flexGrow: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '600', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#777', marginBottom: 24 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111' },
  fieldError: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 6,
    height: 52,
    marginBottom: 14,
  },
  picker: { flex: 1, marginLeft: 6, color: '#111' },
  registerButton: {
    backgroundColor: '#1e88e5',
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#a0c6e9',
  },
  registerText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  loginLink: { textAlign: 'center', fontSize: 14, color: '#777' },
  loginText: { color: '#1e88e5', fontWeight: '500' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
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
  },
  modalPrimaryButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#1e88e5',
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#fff',
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
    borderTopColor: '#1e88e5',
  },
});

export default CivilianRegisterScreen;