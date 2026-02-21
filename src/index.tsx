import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './navigations/appNavigations';
import { Ionicons } from '@expo/vector-icons';

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Logo */}
        <Image
          source={require('./assets/pictures/logo.png')}
          style={styles.logo}
        />

        {/* Title */}
        <Text style={styles.subtitle}>Emergency Response App</Text>

        {/* Square Buttons */}
        <View style={styles.buttonContainer}>

          <TouchableOpacity
            style={[styles.squareButton, styles.civilianButton]}
            onPress={() => navigation.navigate('CivilianLogin')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={34} color="#fff" />
            <Text style={styles.squareButtonText}>Civilian</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.squareButton, styles.rescuerButton]}
            onPress={() => navigation.navigate('RescuerLogin')}
            activeOpacity={0.8}
          >
            <Ionicons name="medkit-outline" size={34} color="#fff" />
            <Text style={styles.squareButtonText}>Rescuer</Text>
          </TouchableOpacity>

        </View>

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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  squareButton: {
    width: 140,
    height: 140, // 👈 true square
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  civilianButton: {
    backgroundColor: '#1e88e5', // blue
  },
  rescuerButton: {
    backgroundColor: '#fb4f00', // orange
  },
  squareButtonText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
});

export default WelcomeScreen;
