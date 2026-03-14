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
    if (node.id === connectedNodeId) return true;

    if (!node.lastSeen) return false;

    const lastSeen = new Date(node.lastSeen).getTime();

    return Date.now() - lastSeen < NODE_INACTIVE_TIMEOUT_MS;
  };


  const formatDistance = (km?: number | null) => {

    if (km === null || km === undefined) return 'N/A';

    if (km < 0.001) return 'Here';

    if (km < 1) return `${Math.round(km * 1000)} m`;

    return `${km.toFixed(2)} km`;
  };


  /* ------------------------------------------------ */
  /* SIGNAL STRENGTH CIRCLES                          */
  /* ------------------------------------------------ */

  const getSignalLevel = (rssi?: number | null) => {

    if (rssi === null || rssi === undefined) return 0;

    if (rssi >= -70) return 4;
    if (rssi >= -85) return 3;
    if (rssi >= -100) return 2;

    return 1;
  };


  const getSignalColor = (level: number) => {

    switch (level) {

      case 4:
        return '#2ecc71'; // green

      case 3:
        return '#f1c40f'; // yellow

      case 2:
        return '#e67e22'; // orange

      case 1:
        return '#e74c3c'; // red

      default:
        return '#999';
    }
  };


  const renderSignalCircles = (rssi?: number | null) => {

    const level = getSignalLevel(rssi);
    const color = getSignalColor(level);

    return (

      <View style={styles.signalWrapper}>

        <Ionicons name="radio-outline" size={14} color="#666" />

        <Text style={styles.info}>{rssi ?? 'N/A'}</Text>

        <View style={styles.circleRow}>

          {[0,1,2,3].map((i) => (

            <View
              key={i}
              style={[
                styles.signalCircle,
                {
                  backgroundColor: i < level ? color : '#ddd'
                }
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

      let allNodes: MeshNode[] = nodesRes.data;

      allNodes.sort((a, b) => {

        if (a.id === localNodeId) return -1;

        if (b.id === localNodeId) return 1;

        return 0;

      });

      setNodes(allNodes);

      setError(null);

    } catch (err: any) {

      console.log(err);

      setError('Cannot connect to mesh');

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


  const renderNode = ({ item }: { item: MeshNode }) => {

    const active = isNodeActive(item);

    const isConnected = item.id === connectedNodeId;


    const handlePress = () => {

      if (!active) {

        Alert.alert('Mesh Node Inactive', 'This mesh node is inactive.');

        return;
      }

      rootNavigation.navigate('MeshNodeChat', {

        nodeId: item.id,
        nodeName: item.name,
        users: item.users

      });

    };


    return (

      <TouchableOpacity
        style={[
          styles.card,
          isConnected && styles.connectedCard,
          !active && styles.inactiveCard
        ]}
        onPress={handlePress}
      >

        <View style={styles.content}>

          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.row}>

            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.info}>{item.users}</Text>

             <Text style={styles.separator}>|</Text>

            {renderSignalCircles(item.signal)}

             <Text style={styles.separator}>|</Text>

            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.info}>{formatDistance(item.distance)}</Text>

          </View>

        </View>

        <Ionicons name="chevron-forward-outline" size={18} color="#bbb" />

      </TouchableOpacity>
    );
  };


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

          <Text style={styles.errorText}>Not connected to mesh</Text>

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
        ListHeaderComponent={<WelcomeCard />}
      />

    </MainLayout>

  );

});


const styles = StyleSheet.create({

  card: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14

  },

  connectedCard: {

    borderWidth: 2,
    borderColor: '#4caf50'

  },

  separator: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 4
  },

  inactiveCard: {

    opacity: 0.5

  },

  content: {

    flex: 1

  },

  name: {

    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6

  },

  row: {

    flexDirection: 'row',
    alignItems: 'center',
    gap: 10

  },

  info: {

    fontSize: 13,
    color: '#666'

  },

  signalWrapper: {

    flexDirection: 'row',
    alignItems: 'center',
    gap: 6

  },

  circleRow: {

    flexDirection: 'row',
    gap: 4

  },

  signalCircle: {

    width: 8,
    height: 8,
    borderRadius: 4

  },

  center: {

    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'

  },

  loadingText: {

    marginTop: 10,
    color: '#666'

  },

  errorText: {

    marginTop: 10,
    fontSize: 16

  }

});

export default MainChatScreen;