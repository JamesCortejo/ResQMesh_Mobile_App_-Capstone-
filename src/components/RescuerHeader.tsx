import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigation } from '../hooks/useRootNavigation';

const RescuerHeader = memo(() => {
  const rootNavigation = useRootNavigation();

  const handleSettingsPress = () => {
    rootNavigation.navigate('RescuerSettings');
  };

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Image
          source={require('../assets/pictures/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>ResQMesh RESCUER</Text>
      </View>

      <Ionicons
        name="settings-outline"
        size={22}
        color="#444"
        onPress={handleSettingsPress}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 0) + 12
        : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 34,
    height: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
});

export default RescuerHeader;