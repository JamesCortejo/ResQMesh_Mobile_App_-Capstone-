import React from 'react';
import { View, StyleSheet } from 'react-native';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

interface Props {
  children: React.ReactNode;
  activeTab: 'chat' | 'distress' | 'map' | 'settings';
}

const MainLayout = ({ children, activeTab }: Props) => {
  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>{children}</View>
      <BottomNav activeTab={activeTab} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16, // 👈 consistent padding for all screens
  },
});

export default MainLayout;