import React, { useCallback, memo } from 'react';
import { FlatList, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import { meshNodes } from '../../data/meshNodes';
import { MeshNode } from '../../types/MeshNode';
import { useRootNavigation } from '../../hooks/useRootNavigation';

const MainChatScreen = memo(() => {
  const rootNavigation = useRootNavigation();

  const renderNode = useCallback(
    ({ item }: { item: MeshNode }) => (
      <TouchableOpacity
        style={[styles.card, item.distress && styles.distressCard]}
        onPress={() =>
          rootNavigation.navigate('MeshNodeChat', {
            nodeName: item.name,
            users: item.users,
          })
        }
      >
        {item.distress && <View style={styles.distressBar} />}
        <View style={styles.content}>
          <Text style={styles.name}>
            Node {item.nodeNumber} – {item.name}
          </Text>
          <View style={styles.row}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.info}>{item.users}</Text>
            <Ionicons name="wifi-outline" size={14} color="#666" />
            <Text style={styles.info}>{item.signal}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward-outline" size={18} color="#bbb" />
      </TouchableOpacity>
    ),
    [rootNavigation]
  );

  return (
    <MainLayout activeTab="chat">
      <FlatList
        data={meshNodes}
        keyExtractor={(item) => item.id}
        renderItem={renderNode}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<WelcomeCard />}
        contentContainerStyle={styles.listContent}
        // Performance optimisations
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
      />
    </MainLayout>
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  distressCard: {
    backgroundColor: '#fff5f5',
  },
  distressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#d32f2f',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  info: {
    fontSize: 13,
    color: '#666',
  },
});

export default MainChatScreen;