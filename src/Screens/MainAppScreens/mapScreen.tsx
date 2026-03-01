import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, LocalTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import api from '../../services/api';

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
}

const MapScreen = () => {
  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [meshConnected, setMeshConnected] = useState(false);
  const [internetOnNode, setInternetOnNode] = useState(false);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);

  const initialRegion = {
    latitude: 7.9203,
    longitude: 125.0911,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      try {
        const statusRes = await api.get('/api/status', { timeout: 3000 });
        if (isMounted) {
          setMeshConnected(true);
          setInternetOnNode(Boolean(statusRes.data.internet));
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
      setNodes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedNode ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [selectedNode]);

  const meshLines = useMemo(
    () =>
      nodes.map((node) => ({
        latitude: node.latitude,
        longitude: node.longitude,
      })),
    [nodes]
  );

  const handleGetDirections = async (node: MeshNode) => {
    if (!meshConnected) {
      Alert.alert('Not Connected', 'You are not connected to any mesh node.');
      return;
    }

    if (!internetOnNode) {
      Alert.alert('No Internet', 'Mesh node has no internet.');
      return;
    }

    try {
      const userLocation = { lat: 7.9203, lng: 125.0911 };

      const routeRes = await api.post('/api/route', {
        origin: userLocation,
        destination: { lat: node.latitude, lng: node.longitude },
      });

      const duration = routeRes.data.routes?.[0]?.duration;
      Alert.alert('Route Fetched', `ETA: ${duration ?? 'unknown'}`);
    } catch {
      Alert.alert('Error', 'Failed to get route.');
    }
  };

  const bottomSheetStyle = {
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
  };

  if (loading) {
    return (
      <MainLayout activeTab="map">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e88e5" />
          <Text style={styles.loadingText}>Connecting to mesh...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeTab="map">
      <View style={styles.container}>
        <WelcomeCard />

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
                strokeColor="#1e88e5"
                strokeWidth={3}
                lineDashPattern={[6, 4]}
              />

              {nodes.map((node) => {
                const extractedNumber = parseInt(
                  node.nodeNumber.replace(/\D/g, ''),
                  10
                );

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
                    <View
                      style={[
                        styles.markerCircle,
                        {
                          backgroundColor: node.distress
                            ? '#b71c1c'
                            : '#1e88e5',
                        },
                      ]}
                    >
                      <Text style={styles.markerText}>
                        {extractedNumber}
                      </Text>
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          ) : (
            <View style={styles.noConnection}>
              <Ionicons name="wifi-outline" size={48} color="#aaa" />
              <Text style={styles.noConnectionText}>
                Not connected to mesh.
              </Text>
            </View>
          )}
        </View>

        {selectedNode && (
          <Animated.View style={[styles.bottomSheet, bottomSheetStyle]}>
            <Text style={styles.sheetTitle}>
              Node {selectedNode.nodeNumber}
            </Text>
            <Text>{selectedNode.name}</Text>
            <Text>Users: {selectedNode.users}</Text>
            <Text>Signal: {selectedNode.signal}</Text>

            <TouchableOpacity
              style={styles.directionBtn}
              onPress={() => handleGetDirections(selectedNode)}
            >
              <Text style={{ color: '#fff' }}>Get Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelectedNode(null)}>
              <Text style={{ marginTop: 10, color: '#1e88e5' }}>
                Close
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </MainLayout>
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
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

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

  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  bottomSheet: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    elevation: 8,
  },

  sheetTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },

  directionBtn: {
    marginTop: 12,
    backgroundColor: '#1e88e5',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
  },

  noConnection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noConnectionText: {
    marginTop: 10,
  },
});

export default MapScreen;