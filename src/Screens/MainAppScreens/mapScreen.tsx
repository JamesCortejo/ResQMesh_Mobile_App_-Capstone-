import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Polyline,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import MainLayout from '../../layouts/MainLayout';
import WelcomeCard from '../../components/WelcomeCard';
import { meshNodes } from '../../data/meshNodes';
import { MeshNode } from '../../types/MeshNode';

const { width, height } = Dimensions.get('window');

const MapScreen = memo(() => {
  const [region, setRegion] = useState({
    latitude: 7.9203,
    longitude: 125.0911,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  });

  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedNode) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [selectedNode, slideAnim]);

  // Memoise mesh lines
  const meshLines = useMemo(
    () => meshNodes.map((node) => ({
      latitude: node.latitude,
      longitude: node.longitude,
    })),
    []
  );

  // Memoise map style
  const mapStyle = useMemo(
    () => [
      { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    ],
    []
  );

  const bottomSheetStyle = {
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
    opacity: slideAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
    }),
  };

  return (
    <MainLayout activeTab="map">
      <View style={styles.container}>
        <WelcomeCard />

        <View style={styles.mapWrapper}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation
            showsPointsOfInterest={false}
            customMapStyle={mapStyle}
            showsMyLocationButton={false}
            showsCompass={false}
            showsScale={false}
            showsIndoors={false}
            toolbarEnabled={false}
          >
            <Polyline
              coordinates={meshLines}
              strokeColor="#1e88e5"
              strokeWidth={3}
              lineDashPattern={[6, 4]}
            />

            {meshNodes.map((node) => (
              <Marker
                key={node.id}
                coordinate={{
                  latitude: node.latitude,
                  longitude: node.longitude,
                }}
                anchor={{ x: 0.5, y: 1 }}
                onPress={() => setSelectedNode(node)}
              >
                <View style={styles.markerContainer}>
                  <Ionicons
                    name="location"
                    size={34}
                    color={node.distress ? '#d32f2f' : '#1e88e5'}
                  />
                  <View style={styles.nodeNumberContainer}>
                    <Text style={styles.nodeNumberText}>
                      {node.nodeNumber}
                    </Text>
                  </View>
                </View>
              </Marker>
            ))}
          </MapView>

          <View style={styles.infoCard}>
            <Ionicons name="git-network-outline" size={18} color="#1e88e5" />
            <Text style={styles.infoText}>
              Mesh network nodes & live connections
            </Text>
          </View>

          {selectedNode && (
            <Animated.View style={[styles.bottomSheet, bottomSheetStyle]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                Node {selectedNode.nodeNumber} – {selectedNode.name}
              </Text>
              <Text style={styles.sheetText}>
                Status:{' '}
                <Text
                  style={{
                    fontWeight: '600',
                    color: selectedNode.distress ? '#d32f2f' : '#2e7d32',
                  }}
                >
                  {selectedNode.distress ? 'Distress Signal' : 'Active'}
                </Text>
              </Text>
              <Text style={styles.sheetText}>Users: {selectedNode.users}</Text>
              <Text style={styles.sheetText}>Signal: {selectedNode.signal}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedNode(null)}
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </MainLayout>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    width: width - 32,
    height: height * 0.69,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    alignSelf: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeNumberContainer: {
    position: 'absolute',
    top: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#111',
  },
  sheetText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  closeBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  closeText: {
    color: '#1e88e5',
    fontWeight: '600',
  },
});

export default MapScreen;