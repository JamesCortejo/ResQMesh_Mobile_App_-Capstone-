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

type RescuerLoginNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RescuerLogin'
>;

interface Props {
  navigation: RescuerLoginNavigationProp;
}

const RescuerLoginScreen: React.FC<Props> = ({ navigation }) => {
  const [rescuerId, setRescuerId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleLogin = () => {
    // Add your authentication logic here
    // On success:
    navigation.replace('RescuerMainTabs');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Rescuer Login</Text>
        <Text style={styles.subtitle}>Authorized personnel only</Text>

        {/* Rescuer ID */}
        <View style={styles.inputContainer}>
          <Ionicons name="id-card-outline" size={20} color="#777" />
          <TextInput
            style={styles.input}
            placeholder="Rescuer ID"
            value={rescuerId}
            onChangeText={setRescuerId}
            autoCapitalize="characters"
          />
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

        {/* Remember Me */}
        <View style={styles.rememberContainer}>
          <Text style={styles.rememberText}>Remember me</Text>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ false: '#ccc', true: '#fb4f00' }}
            thumbColor="#fff"
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>Login</Text>
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
    backgroundColor: '#fb4f00',
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RescuerLoginScreen;