import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import { MeshNode } from '../../types/MeshNode';
import { useRootNavigation } from '../../hooks/useRootNavigation';
import api from '../../services/api';
import { NODE_INACTIVE_TIMEOUT_MS } from '../../constants/timeouts';

const MainChatScreen = memo(() => {
  const rootNavigation = useRootNavigation();
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [connectedNodeId, setConnectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isNodeActive = (node: MeshNode) => {
  // If this is the node we are directly connected to, it's definitely active
  if (node.id === connectedNodeId) return true;

  if (!node.lastSeen) return false;
  const lastSeenTime = new Date(node.lastSeen).getTime();
  return Date.now() - lastSeenTime < NODE_INACTIVE_TIMEOUT_MS;
};

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const statusRes = await api.get('/api/status', { timeout: 3000 });
      if (statusRes.status !== 200) {
        throw new Error('Unable to reach mesh node');
      }
      const localNodeId = statusRes.data.node_id;
      setConnectedNodeId(localNodeId);

      const nodesRes = await api.get('/api/nodes');
      const allNodes: MeshNode[] = nodesRes.data;

      if (allNodes.length === 0) {
        throw new Error('No mesh nodes found');
      }

      setNodes(allNodes);
      setError(null);
    } catch (err: any) {
      console.log('Failed to fetch mesh data', err);
      setError(err.message || 'Cannot connect to mesh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const renderNode = useCallback(
    ({ item }: { item: MeshNode }) => {
      const isConnected = item.id === connectedNodeId;
      const active = isNodeActive(item);
      return (
        <TouchableOpacity
          style={[
            styles.card,
            item.distress && styles.distressCard,
            !active && styles.inactiveCard,
          ]}
          onPress={() =>
            rootNavigation.navigate('MeshNodeChat', {
              nodeId: item.id,
              nodeName: item.name,
              users: item.users,
            })
          }
        >
          {item.distress && <View style={styles.distressBar} />}
          <View style={styles.content}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, !active && styles.inactiveText]}>
                {item.name}
              </Text>
              {!active && (
                <Text style={styles.inactiveBadge}>inactive</Text>
              )}
              {isConnected && (
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedText}>●</Text>
                </View>
              )}
            </View>
            <View style={styles.row}>
              <Ionicons name="people-outline" size={14} color="#666" />
              <Text style={styles.info}>{item.users}</Text>
              <Ionicons name="wifi-outline" size={14} color="#666" />
              <Text style={styles.info}>{item.signal}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color="#bbb" />
        </TouchableOpacity>
      );
    },
    [connectedNodeId, rootNavigation]
  );

  if (loading) {
    return (
      <MainLayout activeTab="chat">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e88e5" />
          <Text style={styles.loadingText}>Connecting to mesh...</Text>
        </View>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout activeTab="chat">
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color="#aaa" />
          <Text style={styles.errorText}>Not connected to any mesh node.</Text>
          <Text style={styles.errorSubText}>
            Please connect to the ResQMesh WiFi hotspot.
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeTab="chat">
      <FlatList
        data={nodes}
        keyExtractor={(item) => item.id}
        renderItem={renderNode}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<WelcomeCard />}
        contentContainerStyle={styles.listContent}
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
  inactiveCard: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginRight: 8,
  },
  inactiveText: {
    color: '#888',
  },
  inactiveBadge: {
    fontSize: 10,
    color: '#888',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    overflow: 'hidden',
  },
  connectedBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  connectedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
  },
  errorSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MainChatScreen;