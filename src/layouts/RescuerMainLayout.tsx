import React from 'react';
import { View, StyleSheet } from 'react-native';
import RescuerHeader from '../components/RescuerHeader';
import RescuerBottomNav from '../components/RescuerBottomNav';
import { useRescuerLocation } from '../hooks/useRescuerLocation';

interface Props {
  children: React.ReactNode;
  activeTab: 'chat' | 'map' | 'assignments';
}

const RescuerMainLayout = ({ children, activeTab }: Props) => {
  useRescuerLocation();

  return (
    <View style={styles.container}>
      <RescuerHeader />
      <View style={styles.content}>{children}</View>
      <RescuerBottomNav activeTab={activeTab} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f6' },
  content: { flex: 1, paddingHorizontal: 16 },
});

export default RescuerMainLayout;