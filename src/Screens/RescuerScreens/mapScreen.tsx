import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, LocalTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import RescuerMainLayout from '../../layouts/RescuerMainLayout';
import RescuerWelcomeCard from '../../components/RescuerWelcomeCard';
import NodeInfoCard from '../../components/NodeInfoCard';
import api from '../../services/api';
import { NODE_INACTIVE_TIMEOUT_MS } from '../../constants/timeouts';

const { width, height } = Dimensions.get('window');

interface MeshNode {
  id: string;
  nodeNumber: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  users: number;
  signal: string;
  distress: boolean;
  lastSeen?: string;
}

interface DistressDetail {
  id: number;
  code: string;
  reason: string;
  lat: number;
  lng: number;
  timestamp: string;
  status: string;
  priority: string;
  user: {
    firstName: string;
    lastName: string;
    phone: string;
    bloodType: string;
    occupation: string;
    age: number;
    address: string;
  };
}

const RescuerMapScreen = () => {
  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);
  const [selectedNodeDistress, setSelectedNodeDistress] = useState<DistressDetail | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [meshConnected, setMeshConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchingDistress, setFetchingDistress] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);
  const pulseAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  const initialRegion = {
    latitude: 7.9203,
    longitude: 125.0911,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  const isNodeActive = (node: MeshNode) => {
    if (node.id === connectedNodeId) return true;
    if (!node.lastSeen) return false;
    const lastSeenTime = new Date(node.lastSeen).getTime();
    return Date.now() - lastSeenTime < NODE_INACTIVE_TIMEOUT_MS;
  };

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      try {
        const statusRes = await api.get('/api/status', { timeout: 3000 });
        if (isMounted) {
          setMeshConnected(true);
          fetchNodes();
        }
      } catch {
        if (isMounted) {
          setMeshConnected(false);
          setNodes([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkConnection();

    const interval = setInterval(() => {
      if (meshConnected) fetchNodes();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [meshConnected]);

  const fetchNodes = async () => {
    try {
      const res = await api.get('/api/nodes');
      const nodeList: MeshNode[] = res.data;
      setNodes(nodeList);

      nodeList.forEach((node) => {
        if (node.distress && !pulseAnims[node.id]) {
          pulseAnims[node.id] = new Animated.Value(1);
          startPulse(node.id);
        }
      });
    } catch (error) {
      console.error('Failed to fetch nodes', error);
    }
  };

  const startPulse = (nodeId: string) => {
    const anim = pulseAnims[nodeId];
    if (!anim) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedNode ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    if (selectedNode?.distress) {
      fetchDistressDetails(selectedNode.id);
    } else {
      setSelectedNodeDistress(null);
    }
  }, [selectedNode]);

  const fetchDistressDetails = async (nodeId: string) => {
    setFetchingDistress(true);
    try {
      const res = await api.get(`/api/node/${nodeId}/distress`);
      setSelectedNodeDistress(res.data);
    } catch (error) {
      console.error('Failed to fetch distress details', error);
    } finally {
      setFetchingDistress(false);
    }
  };

  const meshLines = useMemo(
    () =>
      nodes.map((node) => ({
        latitude: node.latitude,
        longitude: node.longitude,
      })),
    [nodes]
  );

  if (loading) {
    return (
      <RescuerMainLayout activeTab="map">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb4f00" />
          <Text style={styles.loadingText}>Connecting to mesh...</Text>
        </View>
      </RescuerMainLayout>
    );
  }

  return (
    <RescuerMainLayout activeTab="map">
      <View style={styles.container}>
        <RescuerWelcomeCard />

        <View style={styles.mapWrapper}>
          {meshConnected ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              showsUserLocation
              showsCompass={false}
              toolbarEnabled={false}
            >
              <LocalTile
                pathTemplate="http://192.168.4.1:5000/api/map/tiles/{z}/{x}/{y}.png"
                tileSize={256}
                zIndex={0}
              />

              <Polyline
                coordinates={meshLines}
                strokeColor="#fb4f00"
                strokeWidth={3}
                lineDashPattern={[6, 4]}
              />

              {nodes.map((node) => {
                const extractedNumber = parseInt(
                  node.nodeNumber.replace(/\D/g, ''),
                  10
                );
                const isDistressed = node.distress;
                const active = isNodeActive(node);
                const pulseAnim = pulseAnims[node.id];

                let markerColor = '#fb4f00'; // active
                if (!active) markerColor = '#9e9e9e'; // gray
                if (isDistressed) markerColor = '#b71c1c'; // dark red

                return (
                  <Marker
                    key={node.id}
                    coordinate={{
                      latitude: node.latitude,
                      longitude: node.longitude,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    onPress={() => setSelectedNode(node)}
                  >
                    <View>
                      {isDistressed && pulseAnim && (
                        <Animated.View
                          style={[
                            styles.glowBackground,
                            {
                              transform: [{ scale: pulseAnim }],
                              opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.3],
                                outputRange: [0.8, 0],
                              }),
                            },
                          ]}
                        />
                      )}
                      <View
                        style={[
                          styles.markerCircle,
                          { backgroundColor: markerColor },
                        ]}
                      >
                        <Text style={styles.markerText}>{extractedNumber}</Text>
                      </View>
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          ) : (
            <View style={styles.noConnection}>
              <Ionicons name="wifi-outline" size={48} color="#aaa" />
              <Text style={styles.noConnectionText}>Not connected to mesh.</Text>
            </View>
          )}
        </View>

        {selectedNode && (
          <Animated.View
            style={[
              styles.cardContainer,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <NodeInfoCard
              node={selectedNode}
              distressDetails={selectedNodeDistress}
              active={isNodeActive(selectedNode)}
              onClose={() => setSelectedNode(null)}
            />
          </Animated.View>
        )}
      </View>
    </RescuerMainLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrapper: {
    width: width - 32,
    height: height * 0.69,
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
    overflow: 'hidden',
  },
  map: { ...StyleSheet.absoluteFillObject },
  markerCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
  },
  markerText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  glowBackground: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d32f2f',
    top: -3,
    left: -3,
    zIndex: -1,
  },
  cardContainer: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10 },
  noConnection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noConnectionText: { marginTop: 10 },
});

export default RescuerMapScreen;