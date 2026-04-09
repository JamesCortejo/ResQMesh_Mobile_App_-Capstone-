// Screens/RescuerScreens/mapScreen.tsx
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
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RescuerMainLayout from '../../layouts/RescuerMainLayout';
import RescuerWelcomeCard from '../../components/RescuerWelcomeCard';
import NodeInfoCard from '../../components/NodeInfoCard';
import cloudApi from '../../services/cloudApi';
import api from '../../services/api';
import { MeshNode, DistressDetail } from '../../types/MeshNode';

const { width, height } = Dimensions.get('window');

type LngLat = [number, number];

const ONLINE_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const LOCAL_TILE_URL = 'http://192.168.4.1:5000/api/map/tiles/{z}/{x}/{y}.png';
const LOCAL_FONT_URL = 'http://192.168.4.1:5000/fonts/{fontstack}/{range}.pbf';
const ONLINE_FONT_URL = 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf';

const buildMapStyle = (useOnline: boolean) => ({
  version: 8,
  glyphs: useOnline ? ONLINE_FONT_URL : LOCAL_FONT_URL,
  sources: {},
  layers: [],
});

type TileSource = 'online' | 'local' | 'none';

type LiveRouteResponse = {
  assignment: {
    id: number;
    distress_id: number;
    team_id: number | null;
    rescuer_id: number | null;
    assigned_at: string | null;
    eta_minutes: number | null;
    status: string;
    distress: {
      code: string;
      reason: string;
      latitude: number | null;
      longitude: number | null;
      timestamp: string | null;
      priority: string;
      user: {
        firstName: string;
        lastName: string;
        phone: string;
        bloodType: string;
        age: number;
      };
    };
  };
  rescuer_location: {
    latitude: number | null;
    longitude: number | null;
    recorded_at: string | null;
  };
  route: {
    distance_m: number | null;
    duration_s: number | null;
    eta_minutes: number | null;
    coordinates: LngLat[];
  };
};

const isDistressValue = (distress: unknown): boolean => {
  if (distress === true || distress === 1 || distress === 'true') return true;
  if (typeof distress === 'object' && distress !== null) return true;
  return false;
};

const normalizeDistressDetail = (data: any): DistressDetail | null => {
  if (!data) return null;

  const normalized = {
    ...data,
    latitude: data.latitude ?? data.lat ?? null,
    longitude: data.longitude ?? data.lng ?? null,
    user: data.user
      ? {
          ...data.user,
          firstName: data.user.firstName ?? data.user.first_name ?? '',
          lastName: data.user.lastName ?? data.user.last_name ?? '',
          phone: data.user.phone ?? '',
          bloodType: data.user.bloodType ?? data.user.blood_type ?? '',
          age: data.user.age ?? null,
          occupation: data.user.occupation ?? '',
          address: data.user.address ?? '',
        }
      : data.user ?? null,
  };

  return normalized as DistressDetail;
};

const RescuerMapScreen = () => {
  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);
  const [selectedNodeDistress, setSelectedNodeDistress] =
    useState<DistressDetail | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [meshConnected, setMeshConnected] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tileSource, setTileSource] = useState<TileSource>('none');

  const [pulseVisible, setPulseVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [activeRoute, setActiveRoute] = useState<LngLat[]>([]);
  const [activeRouteEta, setActiveRouteEta] = useState<number | null>(null);
  const [activeRouteDistanceKm, setActiveRouteDistanceKm] = useState<number | null>(null);
  const [activeAssignment, setActiveAssignment] =
    useState<LiveRouteResponse['assignment'] | null>(null);

  const mapRef = useRef<any>(null);

  const initialCamera = {
    centerCoordinate: [125.0911, 7.9203] as LngLat,
    zoomLevel: 13,
  };

  const isNodeActive = (status?: string | null, distress?: unknown) => {
    if (isDistressValue(distress)) return true;
    const normalized = String(status ?? '').trim().toLowerCase();
    return ['online', 'active', 'connected', 'mesh', 'available'].includes(normalized);
  };

  const getNodeDistressDetails = (node: MeshNode | null): DistressDetail | null => {
    if (!node) return null;

    const anyNode = node as any;

    return (
      anyNode.distressDetails ??
      anyNode.distress_details ??
      anyNode.distressInfo ??
      anyNode.distress_info ??
      anyNode.distressDetail ??
      anyNode.distress_detail ??
      anyNode.distressPayload ??
      anyNode.distress_payload ??
      null
    );
  };

  useEffect(() => {
    const resolveTileSource = async () => {
      const netState = await NetInfo.fetch();
      console.log('🌐 NetInfo:', netState);

      try {
        await api.get('/api/status', { timeout: 3000 });
        console.log('📡 SWITCHING TO MESH');
        setTileSource('local');
        return;
      } catch {
        // fall through
      }

      const hasInternet =
        netState.isConnected === true && netState.isInternetReachable === true;

      if (hasInternet) {
        console.log('🌐 SWITCHING TO CLOUD');
        setTileSource('online');
      } else {
        console.log('❌ NO CONNECTION');
        setTileSource('none');
      }
    };

    resolveTileSource();
    const interval = setInterval(resolveTileSource, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseVisible((v) => !v);
    }, 700);
    return () => clearInterval(interval);
  }, []);

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
      if (tileSource === 'online') {
        console.log('🌐 CLOUD MODE');
        const res = await cloudApi.get('/api/nodes');
        const list: MeshNode[] = res.data.map((node: any) => ({
          ...node,
          latitude: Number(node.lat ?? node.latitude),
          longitude: Number(node.lng ?? node.longitude),
          users: node.users ?? 0,
          signal: null,
          distress:
            node.distress === true ||
            node.distress === 'true' ||
            node.distress === 1 ||
            false,
          distanceMeters: null,
          status: node.status,
        }));
        console.log(
          '📡 Nodes with distress:',
          list.filter((n) => n.distress).map((n) => n.id)
        );
        setNodes(list);
        setMeshConnected(true);
        return;
      }

      console.log('📡 MESH MODE');
      await api.get('/api/status', { timeout: 3000 });
      setMeshConnected(true);

      const nodesRes = await api.get('/api/nodes');
      const list: MeshNode[] = nodesRes.data.map((node: any) => ({
        ...node,
        latitude: Number(node.latitude ?? node.lat),
        longitude: Number(node.longitude ?? node.lng),
        users: node.users ?? 0,
        signal: node.signal ?? null,
        distress: isDistressValue(node.distress),
        distanceMeters: node.distanceMeters ?? null,
        status: node.status ?? null,
      }));

      setNodes(list);
    } catch (e) {
      console.error('❌ Failed to refresh map data', e);
    } finally {
      if (initialLoading) setInitialLoading(false);
    }
  };

  const fetchDistressDetails = async (node: MeshNode) => {
    const localFallback = getNodeDistressDetails(node);
    if (localFallback) {
      setSelectedNodeDistress(normalizeDistressDetail(localFallback));
      return;
    }

    try {
      const client = tileSource === 'online' ? cloudApi : api;
      const res = await client.get(`/api/node/${node.id}/distress`);
      setSelectedNodeDistress(normalizeDistressDetail(res.data));
    } catch (e) {
      console.error('Failed to fetch distress details', e);
      const fallback = getNodeDistressDetails(node);
      setSelectedNodeDistress(normalizeDistressDetail(fallback));
    }
  };

  const fetchLiveRoute = async () => {
    if (tileSource !== 'online') {
      setActiveRoute([]);
      setActiveAssignment(null);
      setActiveRouteEta(null);
      setActiveRouteDistanceKm(null);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('accessToken');
      console.log('🌐 USING TOKEN FOR ROUTE:', token);

      const res = await cloudApi.get<LiveRouteResponse>('/api/rescuer/route/live', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      console.log('✅ ROUTE RESPONSE:', res.data);

      const data = res.data;

      setActiveAssignment(data.assignment || null);

      const coordinates = data.route?.coordinates || [];
      setActiveRoute(coordinates);

      const eta = data.route?.eta_minutes ?? data.assignment?.eta_minutes ?? null;
      setActiveRouteEta(eta);

      const distanceMeters = data.route?.distance_m ?? null;
      setActiveRouteDistanceKm(
        distanceMeters !== null ? Number(distanceMeters) / 1000 : null
      );
    } catch (e: any) {
      console.log('❌ ROUTE ERROR:', e?.response?.data || e?.message);

      const status = e?.response?.status;
      if (status === 404) {
        setActiveRoute([]);
        setActiveAssignment(null);
        setActiveRouteEta(null);
        setActiveRouteDistanceKm(null);
      }
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [tileSource]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedNode ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    if (!selectedNode?.distress) {
      setSelectedNodeDistress(null);
      return;
    }

    if (tileSource === 'online') {
      fetchDistressDetails(selectedNode);
      return;
    }

    const local = getNodeDistressDetails(selectedNode);
    if (local) {
      setSelectedNodeDistress(normalizeDistressDetail(local));
    } else {
      fetchDistressDetails(selectedNode);
    }
  }, [selectedNode, tileSource]);

  useEffect(() => {
    if (tileSource !== 'online') {
      setActiveRoute([]);
      setActiveAssignment(null);
      setActiveRouteEta(null);
      setActiveRouteDistanceKm(null);
      return;
    }

    fetchLiveRoute();
    const interval = setInterval(fetchLiveRoute, 15000);
    return () => clearInterval(interval);
  }, [tileSource]);

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

  const distressGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: validNodes
        .filter(({ node }) => isDistressValue(node.distress))
        .map(({ coord }) => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: coord },
        })),
    }),
    [validNodes]
  );

  const nodeGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: validNodes.map(({ node, coord }) => ({
        type: 'Feature' as const,
        properties: {
          id: node.id,
          label: formatNodeLabel(node.id),
          status: isDistressValue(node.distress)
            ? 'distress'
            : isNodeActive(node.status, node.distress)
              ? 'active'
              : 'inactive',
          isDistress: isDistressValue(node.distress),
          isActive: isNodeActive(node.status, node.distress),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: coord,
        },
      })),
    }),
    [validNodes]
  );

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

  const mapStyle = useMemo(
    () => buildMapStyle(tileSource === 'online'),
    [tileSource]
  );

  const tileUrl = useMemo(
    () => (tileSource === 'online' ? ONLINE_TILE_URL : LOCAL_TILE_URL),
    [tileSource]
  );

  const tileSourceLabel =
    tileSource === 'online'
      ? '🌐 Online'
      : tileSource === 'local'
      ? '📡 Mesh'
      : null;

  const Legend = () => (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Legend</Text>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#1e88e5' }]} />
        <Text style={styles.legendText}>Active</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#b71c1c' }]} />
        <Text style={styles.legendText}>Distress</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#9e9e9e' }]} />
        <Text style={styles.legendText}>Inactive</Text>
      </View>
    </View>
  );

  if (initialLoading) {
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
          <MapView
            ref={mapRef}
            style={styles.map}
            mapStyle={mapStyle}
            attributionEnabled={false}
            logoEnabled={false}
            compassEnabled={false}
          >
            <Camera defaultSettings={initialCamera} maxZoomLevel={19} />

            {tileSource !== 'none' && (
              <RasterSource
                key={tileSource}
                id="tiles"
                tileUrlTemplates={[tileUrl]}
                tileSize={256}
                maxZoomLevel={19}
              >
                <RasterLayer id="tiles-layer" />
              </RasterSource>
            )}

            {/* Mesh connection lines – rendered UNDER the node circles */}
            {lineGeoJSON && (
              <ShapeSource id="lines" shape={lineGeoJSON}>
                <LineLayer
                  id="lines-layer"
                  belowLayerID="nodes-circle"
                  style={{
                    lineColor: '#1e88e5',
                    lineWidth: 3,
                  }}
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

            {/* Distress pulse layer */}
            <ShapeSource
              key={`distress-pulse-${distressGeoJSON.features.length}`}
              id="distress-pulse"
              shape={distressGeoJSON}
            >
              <CircleLayer
                id="nodes-pulse"
                style={{
                  circleRadius: 26,
                  circleColor: '#ff0000',
                  circleOpacity: pulseVisible ? 0.2 : 0,
                }}
              />
            </ShapeSource>

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
                id="nodes-hit"
                style={{
                  circleRadius: 26,
                  circleOpacity: 0,
                }}
              />
              <CircleLayer
                id="nodes-circle"
                style={{
                  circleRadius: [
                    'case',
                    ['boolean', ['get', 'isDistress'], false],
                    15,
                    18,
                  ],
                  circleColor: [
                    'case',
                    ['boolean', ['get', 'isDistress'], false],
                    '#b71c1c',
                    ['boolean', ['get', 'isActive'], false],
                    '#1e88e5',
                    '#9e9e9e',
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

          {!(meshConnected || tileSource === 'online') && (
            <View style={styles.noConnectionOverlay}>
              <Ionicons name="wifi-outline" size={48} color="#aaa" />
              <Text style={styles.noConnectionText}>Not connected</Text>
            </View>
          )}

          <Legend />

          {tileSourceLabel && (
            <View style={styles.tileBadge}>
              <Text style={styles.tileBadgeText}>{tileSourceLabel}</Text>
            </View>
          )}

          {tileSource === 'online' && (
            <View style={styles.routeBadge}>
              {activeAssignment ? (
                <>
                  <Text style={styles.routeBadgeTitle}>Live Route</Text>
                  <Text style={styles.routeBadgeText}>
                    {activeAssignment.distress.code} • {activeAssignment.distress.reason.toUpperCase()}
                  </Text>
                  <Text style={styles.routeBadgeText}>
                    ETA: {activeRouteEta !== null ? `${activeRouteEta} min` : '—'}
                  </Text>
                  <Text style={styles.routeBadgeText}>
                    Distance:{' '}
                    {activeRouteDistanceKm !== null
                      ? `${activeRouteDistanceKm.toFixed(1)} km`
                      : '—'}
                  </Text>
                </>
              ) : (
                <Text style={styles.routeBadgeText}>No active rescue route</Text>
              )}
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
              active={isNodeActive(selectedNode.status, selectedNode.distress)}
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
    height: height * 0.72,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
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
  legendTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 6, fontSize: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: '#fff', fontSize: 11 },
  tileBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 20,
  },
  tileBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
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
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
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
  cardContainer: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10 },
  noConnectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    zIndex: 10,
  },
  noConnectionText: { marginTop: 10, fontSize: 16, color: '#666' },
});

export default RescuerMapScreen;