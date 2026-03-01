import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const RescuerWelcomeCard = memo(() => {
  const { user } = useAuth();

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <View style={styles.card}>
      <Text style={styles.welcome}>Welcome, {fullName}</Text>

      <View style={styles.userRow}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#fb4f00" />
        <Text style={styles.userId}>{user.code}</Text>
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