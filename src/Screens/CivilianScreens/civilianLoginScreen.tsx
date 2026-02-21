import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigations/appNavigations';
import { Ionicons } from '@expo/vector-icons';

type CivilianLoginNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CivilianLogin'
>;

interface Props {
  navigation: CivilianLoginNavigationProp;
}

const CivilianLoginScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <Text style={styles.title}>Civilian Login</Text>
        <Text style={styles.subtitle}>
          Sign in to request or report emergencies
        </Text>

        {/* Phone Input */}
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

        {/* Password Input */}
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

        {/* Remember Me */}
        <View style={styles.rememberContainer}>
          <Text style={styles.rememberText}>Remember me</Text>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ false: '#ccc', true: '#1e88e5' }}
            thumbColor="#fff"
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.replace('MainTabs')}
        >
        <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>


        {/* Register Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CivilianRegister')}
        >
          <Text style={styles.registerText}>
            Don’t have an account? <Text style={styles.registerLink}>Register</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#111',
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberText: {
    fontSize: 14,
    color: '#555',
  },
  loginButton: {
    backgroundColor: '#1e88e5',
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  registerText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  registerLink: {
    color: '#1e88e5',
    fontWeight: '500',
  },
});

export default CivilianLoginScreen;
