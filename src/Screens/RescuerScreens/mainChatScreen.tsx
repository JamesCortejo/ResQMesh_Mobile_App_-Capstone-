import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import RescuerMainLayout from '../../layouts/RescuerMainLayout';
import RescuerWelcomeCard from '../../components/RescuerWelcomeCard';
import { MeshNode } from '../../types/MeshNode';
import { useRootNavigation } from '../../hooks/useRootNavigation';
import api from '../../services/api';
import { NODE_INACTIVE_TIMEOUT_MS } from '../../constants/timeouts';

type MeshNodeWithExtras = MeshNode & {
  distanceMeters?: number | null;
  signal?: number | string | null;
};

const RescuerMainChatScreen = memo(() => {
  const rootNavigation = useRootNavigation();

  const [nodes, setNodes] = useState<MeshNodeWithExtras[]>([]);
  const [connectedNodeId, setConnectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isNodeActive = (node: MeshNodeWithExtras) => {
    if (node.id === connectedNodeId) return true;
    if (!node.lastSeen) return false;
    return Date.now() - new Date(node.lastSeen).getTime() < NODE_INACTIVE_TIMEOUT_MS;
  };

  const formatDistance = (meters?: number | null) => {
    if (meters === null || meters === undefined) return 'N/A';
    if (meters < 1) return 'Here';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const getRawSignal = (node: MeshNodeWithExtras): number | null => {
    const raw = node.signal;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const getSignalLevel = (node: MeshNodeWithExtras) => {
    if (node.id === connectedNodeId) return 4;

    const rawSignal = getRawSignal(node);

    if (rawSignal !== null) {
      if (rawSignal >= -70) return 4;
      if (rawSignal >= -85) return 3;
      if (rawSignal >= -100) return 2;
      return 1;
    }

    if (!node.lastSeen) return 0;

    const ageMs = Date.now() - new Date(node.lastSeen).getTime();
    if (ageMs > 30000) return 0;

    let freshness = 1;
    if (ageMs > 20000) freshness = 0.4;
    else if (ageMs > 10000) freshness = 0.7;

    let distanceScore = 1;
    if (node.distanceMeters !== null && node.distanceMeters !== undefined) {
      if (node.distanceMeters > 2000) distanceScore = 0.2;
      else if (node.distanceMeters > 1000) distanceScore = 0.5;
      else if (node.distanceMeters > 300) distanceScore = 0.8;
    }

    const score = freshness * distanceScore;

    if (score > 0.8) return 4;
    if (score > 0.6) return 3;
    if (score > 0.3) return 2;
    return 1;
  };

  const getSignalColor = (level: number) => {
    switch (level) {
      case 4:
        return '#2ecc71';
      case 3:
        return '#f1c40f';
      case 2:
        return '#e67e22';
      case 1:
        return '#e74c3c';
      default:
        return '#999';
    }
  };

  const getSignalLabel = (level: number) => {
    switch (level) {
      case 4:
        return 'Excellent';
      case 3:
        return 'Good';
      case 2:
        return 'Weak';
      case 1:
        return 'Poor';
      default:
        return 'No Signal';
    }
  };

  const renderSignal = (node: MeshNodeWithExtras) => {
    if (node.id === connectedNodeId) {
      return (
        <View style={styles.signalWrapper}>
          <Ionicons name="radio-outline" size={14} color="#4caf50" />
          <Text style={[styles.info, { color: '#4caf50', fontWeight: '600' }]}>
            Connected
          </Text>
        </View>
      );
    }

    const level = getSignalLevel(node);
    const color = getSignalColor(level);

    return (
      <View style={styles.signalWrapper}>
        <Ionicons name="radio-outline" size={14} color="#666" />
        <Text style={styles.info}>{getSignalLabel(level)}</Text>
        <View style={styles.circleRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.signalCircle,
                { backgroundColor: i < level ? color : '#ddd' },
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const statusRes = await api.get('/api/status', { timeout: 3000 });
      const localNodeId = statusRes.data.node_id;
      setConnectedNodeId(localNodeId);

      const nodesRes = await api.get('/api/nodes');
      const allNodes: MeshNodeWithExtras[] = nodesRes.data.map((node: any) => ({
        ...node,
        distress: node.distress === true,
        distanceMeters: node.distanceMeters ?? null,
        signal: node.signal ?? null,
      }));

      allNodes.sort((a, b) => {
        if (a.id === localNodeId) return -1;
        if (b.id === localNodeId) return 1;
        return 0;
      });

      setNodes(allNodes);
      setError(null);
    } catch (err) {
      console.log('fetchData error', err);
      setError('Cannot connect to mesh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const renderNode = ({ item }: { item: MeshNodeWithExtras }) => {
    const active = isNodeActive(item);
    const isConnected = item.id === connectedNodeId;

    let stateLabel = '';
    let stateColor = '';

    if (!active) {
      stateLabel = 'INACTIVE';
      stateColor = '#9e9e9e';
    } else if (item.distress) {
      stateLabel = 'DISTRESS';
      stateColor = '#d32f2f';
    } else {
      stateLabel = 'ACTIVE';
      stateColor = '#4caf50';
    }

    const handlePress = () => {
      if (!active) {
        Alert.alert('Inactive Node', 'This node is not reachable.');
        return;
      }

      rootNavigation.navigate('MeshNodeChat', {
        nodeId: item.id,
        nodeName: item.name,
        users: item.users ?? 0,
      });
    };

    return (
      <TouchableOpacity
        style={[
          styles.card,
          item.distress && styles.distressCard,
          !active && styles.inactiveCard,
          isConnected && styles.connectedCard,
        ]}
        onPress={handlePress}
      >
        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Ionicons
              name={item.distress ? 'warning-outline' : 'hardware-chip-outline'}
              size={16}
              color={item.distress ? '#d32f2f' : '#333'}
            />
            <Text style={styles.nodeId}> {item.id}</Text>
            <Text style={styles.name}> - {item.name}</Text>

            <View style={[styles.stateBadge, { backgroundColor: stateColor }]}>
              <Text style={styles.stateText}>{stateLabel}</Text>
            </View>

            {isConnected && (
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedText}>CONNECTED</Text>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.info}>{item.users ?? 0}</Text>

            <Text style={styles.separator}>|</Text>

            {renderSignal(item)}

            <Text style={styles.separator}>|</Text>

            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.info}>{formatDistance(item.distanceMeters)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward-outline" size={18} color="#bbb" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <RescuerMainLayout activeTab="chat">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fb4f00" />
          <Text style={styles.loadingText}>Connecting to mesh...</Text>
        </View>
      </RescuerMainLayout>
    );
  }

  if (error) {
    return (
      <RescuerMainLayout activeTab="chat">
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color="#aaa" />
          <Text style={styles.errorText}>Not connected to any mesh node.</Text>
          <Text style={styles.errorSubText}>
            Please connect to the ResQMesh WiFi hotspot.
          </Text>
        </View>
      </RescuerMainLayout>
    );
  }

  return (
    <RescuerMainLayout activeTab="chat">
      <FlatList
        data={nodes}
        keyExtractor={(item) => item.id}
        renderItem={renderNode}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<RescuerWelcomeCard />}
        contentContainerStyle={styles.listContent}
      />
    </RescuerMainLayout>
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
  connectedCard: {
    borderWidth: 2,
    borderColor: '#4caf50',
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
  nodeId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  name: {
    fontSize: 14,
    color: '#333',
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  stateText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  connectedBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
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
    flexWrap: 'wrap',
  },
  info: {
    fontSize: 13,
    color: '#666',
  },
  separator: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 4,
  },
  signalWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  circleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  signalCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

export default RescuerMainChatScreen;