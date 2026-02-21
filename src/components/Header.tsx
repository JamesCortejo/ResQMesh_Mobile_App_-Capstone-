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
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigations/MainTabs';

const Header = memo(() => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const handleSettingsPress = () => {
    navigation.jumpTo('Settings');
  };

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Image
          source={require('../assets/pictures/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Mesh Network</Text>
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

export default Header;