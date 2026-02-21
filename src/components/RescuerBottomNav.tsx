import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RescuerMainTabParamList } from '../navigations/RescuerMainTabs'; // will be created

interface Props {
  activeTab: 'chat' | 'map';
}

const RescuerBottomNav = memo(({ activeTab }: Props) => {
  const navigation = useNavigation<BottomTabNavigationProp<RescuerMainTabParamList>>();

  const isActive = (tab: Props['activeTab']) => activeTab === tab;

  return (
    <View style={styles.nav}>
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.jumpTo('RescuerMainChat')}
        disabled={isActive('chat')}
      >
        <Ionicons
          name="chatbubble-outline"
          size={22}
          color={isActive('chat') ? '#fb4f00' : '#888'}
        />
        <Text style={[styles.text, isActive('chat') && styles.activeText]}>
          Main Chat
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.jumpTo('RescuerMap')}
        disabled={isActive('map')}
      >
        <Ionicons
          name="map-outline"
          size={22}
          color={isActive('map') ? '#fb4f00' : '#888'}
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
    color: '#fb4f00',
    fontWeight: '600',
  },
});

export default RescuerBottomNav;