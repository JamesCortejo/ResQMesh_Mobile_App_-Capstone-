import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigations/MainTabs';

interface Props {
  activeTab: 'chat' | 'distress' | 'map' | 'settings';
}

const BottomNav = memo(({ activeTab }: Props) => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const isActive = (tab: Props['activeTab']) => activeTab === tab;

  return (
    <View style={styles.nav}>
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.jumpTo('MainChat')} // ✅ use jumpTo
        disabled={isActive('chat')}
      >
        <Ionicons
          name="chatbubble-outline"
          size={22}
          color={isActive('chat') ? '#1e88e5' : '#888'}
        />
        <Text style={[styles.text, isActive('chat') && styles.activeText]}>
          Main Chat
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.jumpTo('DistressSignal')} // ✅ jumpTo
        disabled={isActive('distress')}
      >
        <Ionicons
          name="alert-circle-outline"
          size={22}
          color={isActive('distress') ? '#1e88e5' : '#888'}
        />
        <Text style={[styles.text, isActive('distress') && styles.activeText]}>
          Distress
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.jumpTo('Map')} // ✅ jumpTo
        disabled={isActive('map')}
      >
        <Ionicons
          name="map-outline"
          size={22}
          color={isActive('map') ? '#1e88e5' : '#888'}
        />
        <Text style={[styles.text, isActive('map') && styles.activeText]}>
          Active Map
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e3e3e3',
    backgroundColor: '#fff',
  },
  item: {
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    color: '#888',
  },
  activeText: {
    color: '#1e88e5',
    fontWeight: '600',
  },
});

export default BottomNav;