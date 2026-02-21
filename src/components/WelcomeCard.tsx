import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const WelcomeCard = memo(() => {
  return (
    <View style={styles.card}>
      <Text style={styles.welcome}>Welcome, John Doe</Text>

      <View style={styles.userRow}>
        <Ionicons
          name="person-circle-outline"
          size={18}
          color="#1e88e5"
        />
        <Text style={styles.userId}>USR-7A3F2B</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 14,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userId: {
    fontSize: 13,
    color: '#1e88e5',
    fontWeight: '500',
  },
});

export default WelcomeCard;