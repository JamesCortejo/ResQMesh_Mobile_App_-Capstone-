import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RescuerWelcomeCard = memo(() => {
  return (
    <View style={styles.card}>
      <Text style={styles.welcome}>Welcome, Rescuer Smith</Text>

      <View style={styles.userRow}>
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color="#fb4f00"
        />
        <Text style={styles.userId}>RSQ-7F2B3A</Text>
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
    color: '#fb4f00',
    fontWeight: '500',
  },
});

export default RescuerWelcomeCard;