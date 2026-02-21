import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigations/appNavigations';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

type CivilianRegisterNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CivilianRegister'
>;

interface Props {
  navigation: CivilianRegisterNavigationProp;
}

const CivilianRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Civilian Registration</Text>

        {/* First Name */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        {/* Middle Name */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Middle Name"
            value={middleName}
            onChangeText={setMiddleName}
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* Occupation */}
        <View style={styles.inputContainer}>
          <Ionicons name="briefcase-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Occupation"
            value={occupation}
            onChangeText={setOccupation}
          />
        </View>

        {/* Blood Type Dropdown */}
        <View style={styles.pickerContainer}>
          <Ionicons name="water-outline" size={20} color="#777" />
          <Picker
            selectedValue={bloodType}
            onValueChange={(itemValue) => setBloodType(itemValue)}
            style={styles.picker}
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
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        {/* Register Button */}
        <TouchableOpacity style={styles.registerButton}>
          <Text style={styles.registerText}>Register</Text>
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.loginLink}>
            Already have an account? <Text style={styles.loginText}>Login</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 14,
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
  picker: {
    flex: 1,
    marginLeft: 6,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#111',
  },
  registerButton: {
    backgroundColor: '#1e88e5',
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  registerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loginLink: {
    textAlign: 'center',
    fontSize: 14,
    color: '#777',
  },
  loginText: {
    color: '#1e88e5',
    fontWeight: '500',
  },
});

export default CivilianRegisterScreen;
