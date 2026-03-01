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
import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import { MeshNode } from '../../types/MeshNode';
import { useRootNavigation } from '../../hooks/useRootNavigation';
import api from '../../services/api';

const MainChatScreen = memo(() => {
  const rootNavigation = useRootNavigation();
  const [connectedNode, setConnectedNode] = useState<MeshNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchConnectedNode = async () => {
      try {
        const statusRes = await api.get('/api/status', { timeout: 3000 });
        if (statusRes.status !== 200) {
          throw new Error('Unable to reach mesh node');
        }
        const nodeId = statusRes.data.node_id;

        const nodesRes = await api.get('/api/nodes');
        const nodes: MeshNode[] = nodesRes.data;
        const thisNode = nodes.find(n => n.id === nodeId);

        if (!thisNode) {
          throw new Error('Connected node not found in node list');
        }

        if (isMounted) {
          setConnectedNode(thisNode);
        }
      } catch (err: any) {
        console.log('Failed to fetch connected node', err);
        if (isMounted) {
          setError(err.message || 'Cannot connect to mesh node');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConnectedNode();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderNode = useCallback(
    ({ item }: { item: MeshNode }) => (
      <TouchableOpacity
        style={[styles.card, item.distress && styles.distressCard]}
        onPress={() =>
          rootNavigation.navigate('MeshNodeChat', {
            nodeName: item.name, // Pass the raw name from the API
            users: item.users,
          })
        }
      >
        {item.distress && <View style={styles.distressBar} />}
        <View style={styles.content}>
          <Text style={styles.name}>{item.name}</Text>
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

  if (error || !connectedNode) {
    return (
      <MainLayout activeTab="chat">
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color="#aaa" />
          <Text style={styles.errorText}>Not connected to any mesh node.</Text>
          <Text style={styles.errorSubText}>Please connect to the ResQMesh WiFi hotspot.</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeTab="chat">
      <FlatList
        data={[connectedNode]}
        keyExtractor={(item) => item.id}
        renderItem={renderNode}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<WelcomeCard />}
        contentContainerStyle={styles.listContent}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
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