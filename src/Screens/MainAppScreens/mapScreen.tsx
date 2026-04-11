import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import {
  fetchCivilianLiveRoute,
  LngLat,
  RouteFetchStatus,
} from '../../services/routeService';
import { NODE_INACTIVE_TIMEOUT_MS } from '../../constants/timeouts';
import { MeshNode, DistressDetail } from '../../types/MeshNode';

const { width, height } = Dimensions.get('window');

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const MAP_STYLE = {
  version: 8,
  glyphs: 'http://192.168.4.1:5000/fonts/{fontstack}/{range}.pbf',
  sources: {},
  layers: [],
};

const INITIAL_CAMERA = {
  centerCoordinate: [125.0911, 7.9203] as LngLat,
  zoomLevel: 13,
};

// ----------------------------------------------------------------------------
// Helper functions
// ----------------------------------------------------------------------------
const normalizeCoords = (node: MeshNode): LngLat | null => {
  const lat = Number(node.latitude ?? node.lat);
  const lng = Number(node.longitude ?? node.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lng, lat];
};

const formatNodeLabel = (id: string): string => {
  const match = id.match(/^([A-Za-z]+)0*(\d+)$/);
  return match ? `${match[1]}${match[2]}` : id;
};

const isNodeActive = (node: MeshNode, connectedNodeId: string | null): boolean => {
  if (node.id === connectedNodeId) return true;
  if (!node.lastSeen) return false;
  return Date.now() - new Date(node.lastSeen).getTime() < NODE_INACTIVE_TIMEOUT_MS;
};

type NodeStatus = 'active' | 'inactive' | 'distress';
const getNodeStatus = (node: MeshNode, connectedNodeId: string | null): NodeStatus => {
  if (node.distress) return 'distress';
  return isNodeActive(node, connectedNodeId) ? 'active' : 'inactive';
};

// ----------------------------------------------------------------------------
// Custom Hooks
// ----------------------------------------------------------------------------
const useMeshConnection = () => {
  const [connectedNodeId, setConnectedNodeId] = useState<string | null>(null);
  const [meshConnected, setMeshConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkConnection = async () => {
      try {
        const status = await api.get('/api/status');
        if (isMounted) {
          setConnectedNodeId(status.data.node_id);
          setMeshConnected(true);
        }
      } catch {
        if (isMounted) {
          setMeshConnected(false);
          setConnectedNodeId(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    checkConnection();
    return () => {
      isMounted = false;
    };
  }, []);

  return { meshConnected, connectedNodeId, loading };
};

const useNodes = (meshConnected: boolean) => {
  const [nodes, setNodes] = useState<MeshNode[]>([]);

  const fetchNodes = useCallback(async () => {
    if (!meshConnected) return;
    try {
      const res = await api.get('/api/nodes');
      setNodes(res.data);
    } catch (e) {
      console.error('❌ FETCH NODES ERROR:', e);
    }
  }, [meshConnected]);

  useEffect(() => {
    if (!meshConnected) return;
    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, [meshConnected, fetchNodes]);

  return nodes;
};

const useSelectedNode = () => {
  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);
  const [distressDetails, setDistressDetails] = useState<DistressDetail | null>(null);

  const fetchDistressDetails = useCallback(async (nodeId: string) => {
    try {
      const res = await api.get(`/api/node/${nodeId}/distress`);
      setDistressDetails(res.data);
    } catch (e) {
      console.error('❌ FETCH DISTRESS ERROR:', e);
      setDistressDetails(null);
    }
  }, []);

  useEffect(() => {
    if (selectedNode?.distress) {
      fetchDistressDetails(selectedNode.id);
    } else {
      setDistressDetails(null);
    }
  }, [selectedNode, fetchDistressDetails]);

  return { selectedNode, setSelectedNode, distressDetails };
};

const usePulseAnimation = () => {
  const [pulse, setPulse] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p === 1 ? 1.5 : 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);
  return pulse;
};

// ----------------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------------
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

interface MapContentProps {
  nodes: MeshNode[];
  connectedNodeId: string | null;
  pulse: number;
  activeRoute: LngLat[];
  onNodePress: (node: MeshNode) => void;
}

const MapContent = React.memo(({ nodes, connectedNodeId, pulse, activeRoute, onNodePress }: MapContentProps) => {
  const validNodes = useMemo(() => {
    return nodes
      .map(node => {
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
            coordinates: validNodes.map(n => n.coord),
          },
        },
      ],
    };
  }, [validNodes]);

  const nodeGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: validNodes.map(({ node, coord }) => ({
        type: 'Feature' as const,
        properties: {
          id: node.id,
          label: formatNodeLabel(node.id),
          status: getNodeStatus(node, connectedNodeId),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: coord,
        },
      })),
    };
  }, [validNodes, connectedNodeId]);

  const routeGeoJSON = useMemo(() => {
    if (!activeRoute || activeRoute.length < 2) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: activeRoute,
          },
        },
      ],
    };
  }, [activeRoute]);

  const routeMarkersGeoJSON = useMemo(() => {
    if (!activeRoute || activeRoute.length < 2) return null;

    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: { kind: 'start' },
          geometry: {
            type: 'Point' as const,
            coordinates: activeRoute[0],
          },
        },
        {
          type: 'Feature' as const,
          properties: { kind: 'end' },
          geometry: {
            type: 'Point' as const,
            coordinates: activeRoute[activeRoute.length - 1],
          },
        },
      ],
    };
  }, [activeRoute]);

  const handleNodePress = useCallback(
    (e: any) => {
      const id = e.features?.[0]?.properties?.id;
      const found = nodes.find(n => n.id === id);
      if (found) onNodePress(found);
    },
    [nodes, onNodePress]
  );

  return (
    <MapView
      style={styles.map}
      mapStyle={MAP_STYLE}
      attributionEnabled={false}
      logoEnabled={false}
      compassEnabled={false}
    >
      {/* defaultSettings is a one-time seed — never overrides user gestures */}
      <Camera defaultSettings={INITIAL_CAMERA} maxZoomLevel={19} />

      <RasterSource
        id="tiles"
        tileUrlTemplates={['http://192.168.4.1:5000/api/map/tiles/{z}/{x}/{y}.png']}
        tileSize={256}
        maxZoomLevel={19}
      >
        <RasterLayer id="tiles-layer" />
      </RasterSource>

      {lineGeoJSON && (
        <ShapeSource id="lines" shape={lineGeoJSON}>
          <LineLayer
            id="lines-layer"
            belowLayerID="nodes-pulse"
            style={{ lineColor: '#1e88e5', lineWidth: 3 }}
          />
        </ShapeSource>
      )}

      {routeGeoJSON && (
        <ShapeSource id="route" shape={routeGeoJSON}>
          <LineLayer
            id="route-line-glow"
            style={{
              lineColor: '#8B0000',
              lineWidth: 12,
              lineOpacity: 0.25,
              lineBlur: 2,
            }}
          />
          <LineLayer
            id="route-line"
            style={{
              lineColor: '#8B0000',
              lineWidth: 6,
            }}
          />
        </ShapeSource>
      )}

      {routeMarkersGeoJSON && (
        <ShapeSource id="route-markers" shape={routeMarkersGeoJSON}>
          <CircleLayer
            id="route-start-pulse"
            filter={['==', ['get', 'kind'], 'start']}
            style={{
              circleRadius: 18,
              circleColor: '#1e88e5',
              circleOpacity: 0.2,
            }}
          />
          <CircleLayer
            id="route-start-marker"
            filter={['==', ['get', 'kind'], 'start']}
            style={{
              circleRadius: 11,
              circleColor: '#1e88e5',
              circleStrokeWidth: 3,
              circleStrokeColor: '#ffffff',
            }}
          />
          <CircleLayer
            id="route-end-marker"
            filter={['==', ['get', 'kind'], 'end']}
            style={{
              circleRadius: 9,
              circleColor: '#b71c1c',
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff',
            }}
          />
        </ShapeSource>
      )}

      <ShapeSource id="nodes" shape={nodeGeoJSON} onPress={handleNodePress}>
        <CircleLayer
          id="nodes-pulse"
          style={{
            circleRadius: ['case', ['==', ['get', 'status'], 'distress'], 20 * pulse, 0],
            circleColor: '#ff0000',
            circleOpacity: 0.25,
          }}
        />
        <CircleLayer
          id="nodes-hit"
          style={{ circleRadius: 26, circleOpacity: 0 }}
        />
        <CircleLayer
          id="nodes-circle"
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
        <SymbolLayer
          id="nodes-label"
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
  );
});

interface NodeInfoCardWrapperProps {
  node: MeshNode | null;
  distressDetails: DistressDetail | null;
  connectedNodeId: string | null;
  onClose: () => void;
}

const NodeInfoCardWrapper = ({
  node,
  distressDetails,
  connectedNodeId,
  onClose,
}: NodeInfoCardWrapperProps) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: node ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [node, slideAnim]);

  if (!node) return null;

  return (
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
        node={node}
        distressDetails={distressDetails}
        active={isNodeActive(node, connectedNodeId)}
        onClose={onClose}
      />
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// Main Screen Component
// ----------------------------------------------------------------------------
const MapScreen = () => {
  const { meshConnected, connectedNodeId, loading } = useMeshConnection();
  const nodes = useNodes(meshConnected);
  const { selectedNode, setSelectedNode, distressDetails } = useSelectedNode();
  const pulse = usePulseAnimation();
  const [activeRoute, setActiveRoute] = useState<LngLat[]>([]);
  const [activeRouteEta, setActiveRouteEta] = useState<number | null>(null);
  const [activeRouteDistanceKm, setActiveRouteDistanceKm] = useState<number | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteFetchStatus>('no-assignment');
  const [routeMessage, setRouteMessage] = useState('No active rescue route.');

  useEffect(() => {
    const fetchLiveRoute = async () => {
      if (!meshConnected) {
        setActiveRoute([]);
        setActiveRouteEta(null);
        setActiveRouteDistanceKm(null);
        setRouteStatus('unavailable');
        setRouteMessage('Live route unavailable. Connect to mesh hotspot.');
        return;
      }

      const result = await fetchCivilianLiveRoute(connectedNodeId);
      setRouteStatus(result.status);
      setRouteMessage(result.message ?? '');

      if (result.status !== 'available' || !result.data) {
        setActiveRoute([]);
        setActiveRouteEta(null);
        setActiveRouteDistanceKm(null);
        return;
      }

      const data = result.data;
      const coordinates = data.route?.coordinates || [];
      setActiveRoute(coordinates);

      const eta = data.route?.eta_minutes ?? data.assignment?.eta_minutes ?? null;
      setActiveRouteEta(eta);

      const distanceMeters = data.route?.distance_m ?? null;
      setActiveRouteDistanceKm(
        distanceMeters !== null ? Number(distanceMeters) / 1000 : null
      );
    };

    fetchLiveRoute();
    const interval = setInterval(fetchLiveRoute, 15000);
    return () => clearInterval(interval);
  }, [connectedNodeId, meshConnected]);

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
              <MapContent
                nodes={nodes}
                connectedNodeId={connectedNodeId}
                pulse={pulse}
                activeRoute={activeRoute}
                onNodePress={setSelectedNode}
              />
              <Legend />

              <View style={styles.routeBadge}>
                {routeStatus === 'available' ? (
                  <>
                    <Text style={styles.routeBadgeTitle}>Rescue ETA</Text>
                    <Text style={styles.routeBadgeText}>
                      ETA: {activeRouteEta !== null ? `${activeRouteEta} min` : '—'}
                    </Text>
                    <Text style={styles.routeBadgeText}>
                      Distance:{' '}
                      {activeRouteDistanceKm !== null
                        ? `${activeRouteDistanceKm.toFixed(1)} km`
                        : '—'}
                    </Text>
                    {activeRoute.length < 2 && (
                      <Text style={styles.routeBadgeHint}>
                        Route path unavailable on this node. Showing ETA only.
                      </Text>
                    )}
                  </>
                ) : routeStatus === 'unavailable' ? (
                  <>
                    <Text style={styles.routeBadgeTitle}>Rescue ETA</Text>
                    <Text style={styles.routeBadgeText}>{routeMessage || 'Live route unavailable.'}</Text>
                  </>
                ) : (
                  <Text style={styles.routeBadgeText}>No active rescue route</Text>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noConnection}>
              <Ionicons name="wifi-outline" size={48} color="#aaa" />
              <Text>Not connected</Text>
            </View>
          )}
        </View>
        <NodeInfoCardWrapper
          node={selectedNode}
          distressDetails={distressDetails}
          connectedNodeId={connectedNodeId}
          onClose={() => setSelectedNode(null)}
        />
      </View>
    </MainLayout>
  );
};

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
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
  routeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(139, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 20,
    maxWidth: width * 0.52,
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  routeBadgeTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  routeBadgeText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 16,
  },
  routeBadgeHint: {
    marginTop: 4,
    color: '#ffd9d9',
    fontSize: 10,
    lineHeight: 14,
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