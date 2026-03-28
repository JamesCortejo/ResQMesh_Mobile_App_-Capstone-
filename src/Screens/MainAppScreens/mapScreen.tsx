import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {
  MapView,
  Camera,
  RasterSource,
  RasterLayer,
  ShapeSource,
  LineLayer,
  CircleLayer,
  SymbolLayer,
} from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';

import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import NodeInfoCard from '../../components/NodeInfoCard';
import api from '../../services/api';
import { NODE_INACTIVE_TIMEOUT_MS } from '../../constants/timeouts';

const { width, height } = Dimensions.get('window');

type LngLat = [number, number];

const MAP_STYLE = {
  version: 8,
  glyphs: 'http://192.168.4.1:5000/fonts/{fontstack}/{range}.pbf',
  sources: {},
  layers: [],
};

const MapScreen = () => {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedNodeDistress, setSelectedNodeDistress] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [meshConnected, setMeshConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectedNodeId, setConnectedNodeId] = useState<string | null>(null);

  const [pulse, setPulse] = useState(1); // 🔥 animation state
  const slideAnim = useRef(new Animated.Value(0)).current;

  const initialCamera = {
    centerCoordinate: [125.0911, 7.9203] as LngLat,
    zoomLevel: 13,
  };

  // 🔴 Pulse animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p === 1 ? 1.5 : 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // ---------- Legend ----------
  const Legend = () => (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Legend</Text>

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#1e88e5' }]} />
        <Text style={styles.legendText}>Active</Text>
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#9e9e9e' }]} />
        <Text style={styles.legendText}>Inactive</Text>
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#b71c1c' }]} />
        <Text style={styles.legendText}>Distress</Text>
      </View>
    </View>
  );

  // ---------- Utils ----------
  const normalizeCoords = (node: any): LngLat | null => {
    const lat = Number(node.latitude ?? node.lat);
    const lng = Number(node.longitude ?? node.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lng, lat];
  };

  const formatNodeLabel = (id: string) => {
    const match = id.match(/^([A-Za-z]+)0*(\d+)$/);
    if (match) return `${match[1]}${match[2]}`;
    return id;
  };

  const isNodeActive = (node: any) => {
    if (node.id === connectedNodeId) return true;
    if (!node.lastSeen) return false;
    return Date.now() - new Date(node.lastSeen).getTime() < NODE_INACTIVE_TIMEOUT_MS;
  };

  const getNodeStatus = (node: any) => {
    if (node.distress) return 'distress';
    if (isNodeActive(node)) return 'active';
    return 'inactive';
  };

  // ---------- Fetch ----------
  const fetchNodes = async () => {
    try {
      const res = await api.get('/api/nodes');
      setNodes(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDistressDetails = async (nodeId: string) => {
    try {
      const res = await api.get(`/api/node/${nodeId}/distress`);
      setSelectedNodeDistress(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await api.get('/api/status');
        setConnectedNodeId(status.data.node_id);
        setMeshConnected(true);
        fetchNodes();
      } catch {
        setMeshConnected(false);
        setNodes([]);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedNode ? 1 : 0,
      useNativeDriver: true,
    }).start();

    if (selectedNode?.distress) {
      fetchDistressDetails(selectedNode.id);
    } else {
      setSelectedNodeDistress(null);
    }
  }, [selectedNode]);

  // ---------- Data ----------
  const validNodes = useMemo(() => {
    return nodes
      .map((node) => {
        const coord = normalizeCoords(node);
        return coord ? { node, coord } : null;
      })
      .filter((n): any => n !== null);
  }, [nodes]);

  const lineGeoJSON = useMemo(() => {
    if (validNodes.length < 2) return null;

    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: validNodes.map((n: any) => n.coord),
          },
        },
      ],
    };
  }, [validNodes]);

  const nodeGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: validNodes.map(({ node, coord }: any) => ({
      type: 'Feature' as const,
      properties: {
        id: node.id,
        label: formatNodeLabel(node.id),
        status: getNodeStatus(node),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: coord,
      },
    })),
  }), [validNodes]);

  if (loading) {
    return (
      <MainLayout activeTab="map">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e88e5" />
          <Text>Connecting...</Text>
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
            <>
              <MapView
                style={styles.map}
                mapStyle={MAP_STYLE}
                attributionEnabled={false}
                logoEnabled={false}
                compassEnabled={false}
              >
                <Camera defaultSettings={initialCamera} maxZoomLevel={19} />

                {/* Tiles */}
                <RasterSource
                  id="tiles"
                  tileUrlTemplates={[
                    'http://192.168.4.1:5000/api/map/tiles/{z}/{x}/{y}.png',
                  ]}
                  tileSize={256}
                  maxZoomLevel={19}
                >
                  <RasterLayer id="tiles-layer" />
                </RasterSource>

                {/* Lines */}
                {lineGeoJSON && (
                  <ShapeSource id="lines" shape={lineGeoJSON}>
                    <LineLayer
                      id="lines-layer"
                      style={{
                        lineColor: '#1e88e5',
                        lineWidth: 3,
                      }}
                    />
                  </ShapeSource>
                )}

                {/* Nodes */}
                <ShapeSource
                  id="nodes"
                  shape={nodeGeoJSON}
                  onPress={(e) => {
                    const id = e.features?.[0]?.properties?.id;
                    const found = nodes.find((n) => n.id === id);
                    if (found) setSelectedNode(found);
                  }}
                >
                  {/* 🔴 Glow */}
                  <CircleLayer
                    id="nodes-pulse"
                    aboveLayerID="lines-layer"
                    style={{
                      circleRadius: [
                        'case',
                        ['==', ['get', 'status'], 'distress'],
                        20 * pulse,
                        0,
                      ],
                      circleColor: '#ff0000',
                      circleOpacity: 0.25,
                    }}
                  />

                  {/* Hitbox */}
                  <CircleLayer
                    id="nodes-hit"
                    aboveLayerID="lines-layer"
                    style={{
                      circleRadius: 26,
                      circleOpacity: 0,
                    }}
                  />

                  {/* Main circle */}
                  <CircleLayer
                    id="nodes-circle"
                    aboveLayerID="lines-layer"
                    style={{
                      circleRadius: 18,
                      circleColor: [
                        'match',
                        ['get', 'status'],
                        'distress', '#b71c1c',
                        'active', '#1e88e5',
                        'inactive', '#9e9e9e',
                        '#1e88e5',
                      ],
                      circleStrokeWidth: 2,
                      circleStrokeColor: '#ffffff',
                    }}
                  />

                  {/* Labels */}
                  <SymbolLayer
                    id="nodes-label"
                    aboveLayerID="nodes-circle"
                    style={{
                      textField: ['get', 'label'],
                      textSize: 10,
                      textColor: '#ffffff',
                      textFont: ['Open Sans Regular'],
                      textAnchor: 'center',
                      textAllowOverlap: true,
                      textIgnorePlacement: true,
                    }}
                  />
                </ShapeSource>
              </MapView>

              <Legend />
            </>
          ) : (
            <View style={styles.noConnection}>
              <Ionicons name="wifi-outline" size={48} color="#aaa" />
              <Text>Not connected</Text>
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
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  mapWrapper: {
    width: width - 32,
    height: height * 0.72,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },

  map: { flex: 1 },

  legendContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
    zIndex: 20,
  },

  legendTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 12,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },

  legendText: {
    color: '#fff',
    fontSize: 11,
  },

  cardContainer: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noConnection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapScreen;