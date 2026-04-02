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

import RescuerMainLayout from '../../layouts/RescuerMainLayout';
import RescuerWelcomeCard from '../../components/RescuerWelcomeCard';
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

type MeshNode = {
  id: string;
  nodeNumber?: string;
  name: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  users?: number;
  signal?: number | string | null;
  distress?: boolean;
  lastSeen?: string;
  distanceMeters?: number | null;
};

type DistressDetail = {
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
};

const RescuerMapScreen = () => {
  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);
  const [selectedNodeDistress, setSelectedNodeDistress] =
    useState<DistressDetail | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [meshConnected, setMeshConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectedNodeId, setConnectedNodeId] = useState<string | null>(null);

  const [pulse, setPulse] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const initialCamera = {
    centerCoordinate: [125.0911, 7.9203] as LngLat,
    zoomLevel: 13,
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p === 1 ? 1.5 : 1));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const isNodeActive = (node: MeshNode) => {
    if (node.id === connectedNodeId) return true;
    if (!node.lastSeen) return false;
    return Date.now() - new Date(node.lastSeen).getTime() < NODE_INACTIVE_TIMEOUT_MS;
  };

  const getRawSignal = (node: MeshNode): number | null => {
    const raw = node.signal;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const getSignalLevel = (node: MeshNode) => {
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

  const getNodeStatus = (node: MeshNode) => {
    if (node.distress) return 'distress';
    if (isNodeActive(node)) return 'active';
    return 'inactive';
  };

  const formatNodeLabel = (id: string) => {
    const match = id.match(/^([A-Za-z]+)0*(\d+)$/);
    if (match) return `${match[1]}${match[2]}`;
    return id;
  };

  const normalizeCoords = (node: MeshNode): LngLat | null => {
    const lat = Number(node.latitude ?? node.lat);
    const lng = Number(node.longitude ?? node.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lng, lat];
  };

  const refreshAll = async () => {
    try {
      const statusRes = await api.get('/api/status', { timeout: 3000 });
      const localNodeId = statusRes.data.node_id;
      setConnectedNodeId(localNodeId);
      setMeshConnected(true);

      const nodesRes = await api.get('/api/nodes');
      const list: MeshNode[] = nodesRes.data.map((node: any) => ({
        ...node,
        latitude: Number(node.latitude ?? node.lat),
        longitude: Number(node.longitude ?? node.lng),
        users: node.users ?? 0,
        signal: node.signal ?? null,
        distress: node.distress === true,
        distanceMeters: node.distanceMeters ?? null,
      }));

      list.sort((a, b) => {
        if (a.id === localNodeId) return -1;
        if (b.id === localNodeId) return 1;
        return 0;
      });

      setNodes(list);
    } catch (e) {
      console.error('Failed to refresh map data', e);
      setMeshConnected(false);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistressDetails = async (nodeId: string) => {
    try {
      const res = await api.get(`/api/node/${nodeId}/distress`);
      setSelectedNodeDistress(res.data);
    } catch (e) {
      console.error('Failed to fetch distress details', e);
    }
  };

  useEffect(() => {
    refreshAll();

    const interval = setInterval(() => {
      refreshAll();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

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

  const validNodes = useMemo(() => {
    return nodes
      .map((node) => {
        const coord = normalizeCoords(node);
        return coord ? { node, coord } : null;
      })
      .filter((n): n is { node: MeshNode; coord: LngLat } => n !== null);
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
            coordinates: validNodes.map((n) => n.coord),
          },
        },
      ],
    };
  }, [validNodes]);

  const nodeGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: validNodes.map(({ node, coord }) => ({
        type: 'Feature' as const,
        properties: {
          id: node.id,
          label: formatNodeLabel(node.id),
          status: getNodeStatus(node),
          signalLevel: getSignalLevel(node),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: coord,
        },
      })),
    }),
    [validNodes, connectedNodeId, pulse]
  );

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
            <>
              <MapView
                style={styles.map}
                mapStyle={MAP_STYLE}
                attributionEnabled={false}
                logoEnabled={false}
                compassEnabled={false}
              >
                <Camera defaultSettings={initialCamera} maxZoomLevel={19} />

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

                <ShapeSource
                  id="nodes"
                  shape={nodeGeoJSON}
                  onPress={(e) => {
                    const id = e.features?.[0]?.properties?.id;
                    const found = nodes.find((n) => n.id === id);
                    if (found) setSelectedNode(found);
                  }}
                >
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

                  <CircleLayer
                    id="nodes-hit"
                    aboveLayerID="lines-layer"
                    style={{
                      circleRadius: 26,
                      circleOpacity: 0,
                    }}
                  />

                  <CircleLayer
                    id="nodes-circle"
                    aboveLayerID="lines-layer"
                    style={{
                      circleRadius: 18,
                      circleColor: [
                        'match',
                        ['get', 'status'],
                        'distress',
                        '#b71c1c',
                        'active',
                        '#1e88e5',
                        'inactive',
                        '#9e9e9e',
                        '#1e88e5',
                      ],
                      circleStrokeWidth: 2,
                      circleStrokeColor: '#ffffff',
                    }}
                  />

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
              <Text style={styles.noConnectionText}>Not connected</Text>
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
  container: {
    flex: 1,
  },
  mapWrapper: {
    width: width - 32,
    height: height * 0.72,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
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

export default RescuerMapScreen;