import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MeshNode, DistressDetail } from '../types/MeshNode';
import { NODE_INACTIVE_TIMEOUT_MS } from '../constants/timeouts';
import { formatLocalTime12hr } from '../utils/dateHelpers';

interface NodeInfoCardProps {
  node: MeshNode;
  distressDetails: DistressDetail | null;
  active?: boolean;
  onClose: () => void;
}

const toMs = (value: unknown): number => {
  if (typeof value === 'number') {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
      return asNumber < 1e12 ? asNumber * 1000 : asNumber;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  }
  return NaN;
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

const getSignalLevel = (node: MeshNode, connectedNodeId?: string | null): number => {
  if (node.id === connectedNodeId) return 4;

  const rawSignal = getRawSignal(node);
  if (rawSignal !== null) {
    if (rawSignal >= -70) return 4;
    if (rawSignal >= -85) return 3;
    if (rawSignal >= -100) return 2;
    return 1;
  }

  if (!node.lastSeen) return 0;
  const lastSeenMs = toMs(node.lastSeen);
  if (Number.isNaN(lastSeenMs)) return 0;

  const ageMs = Date.now() - lastSeenMs;
  if (ageMs > NODE_INACTIVE_TIMEOUT_MS) return 0;

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
    case 4: return '#2ecc71';
    case 3: return '#f1c40f';
    case 2: return '#e67e22';
    case 1: return '#e74c3c';
    default: return '#999';
  }
};

const getSignalLabel = (level: number) => {
  switch (level) {
    case 4: return 'Excellent';
    case 3: return 'Good';
    case 2: return 'Weak';
    case 1: return 'Poor';
    default: return 'No Signal';
  }
};

interface SignalIndicatorProps {
  node: MeshNode;
  color: string;
}

const SignalIndicator = ({ node, color }: SignalIndicatorProps) => {
  const level = getSignalLevel(node);
  const signalColor = getSignalColor(level);
  const label = getSignalLabel(level);
  const rawSignal = getRawSignal(node);

  return (
    <View style={styles.row}>
      <Ionicons name="wifi-outline" size={16} color={color} />
      <View style={styles.signalContent}>
        <View style={styles.signalRow}>
          <Text style={styles.infoText}>Signal: </Text>
          <Text style={[styles.signalLabel, { color: signalColor }]}>{label}</Text>
          <View style={styles.circleRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.signalCircle,
                  { backgroundColor: i < level ? signalColor : '#ddd' },
                ]}
              />
            ))}
          </View>
        </View>
        {rawSignal !== null ? (
          <Text style={styles.rssiText}>{rawSignal} dBm</Text>
        ) : (
          <Text style={styles.rssiText}>RSSI unavailable (transparent mode)</Text>
        )}
      </View>
    </View>
  );
};

const NodeInfoCard: React.FC<NodeInfoCardProps> = ({
  node,
  distressDetails,
  active,
  onClose,
}) => {
  const isActive = active !== undefined ? active : node.status === 'active';

  let borderColor = '#e0e0e0';
  let iconColor = '#1e88e5';
  let titleColor = '#111';

  if (!isActive) {
    borderColor = '#9e9e9e';
    iconColor = '#9e9e9e';
    titleColor = '#9e9e9e';
  } else if (node.distress) {
    borderColor = '#d32f2f';
    iconColor = '#d32f2f';
    titleColor = '#d32f2f';
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return formatLocalTime12hr(dateString);
  };

  const formatCoordinate = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '?';
    }
    return Number(value).toFixed(5);
  };

  const renderContent = () => {
    if (!isActive) {
      return (
        <>
          <View style={styles.row}>
            <Ionicons name="power-outline" size={16} color="#9e9e9e" />
            <Text style={[styles.infoText, { color: '#666' }]}>Node Offline</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color="#9e9e9e" />
            <Text style={[styles.infoText, { color: '#666' }]}>
              Last seen: {formatDate(node.lastSeen)}
            </Text>
          </View>
          {distressDetails && (
            <>
              <View style={[styles.row, styles.distressHeader, { marginTop: 12 }]}>
                <Ionicons name="warning" size={18} color="#9e9e9e" />
                <Text style={[styles.distressTitle, { color: '#9e9e9e' }]}>
                  DISTRESS (stale)
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="person-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>
                  Victim: {distressDetails.user?.firstName ?? '?'} {distressDetails.user?.lastName ?? ''}
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="call-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>Phone: {distressDetails.user?.phone ?? 'N/A'}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="alert-circle-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>Emergency: {distressDetails.reason ?? 'Unknown'}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="time-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>Reported: {formatDate(distressDetails.timestamp)}</Text>
              </View>
            </>
          )}
        </>
      );
    }

    if (node.distress) {
      if (!distressDetails) {
        return (
          <View style={styles.row}>
            <Ionicons name="alert-circle-outline" size={16} color="#d32f2f" />
            <Text style={[styles.infoText, { color: '#d32f2f' }]}>Loading distress details...</Text>
          </View>
        );
      }

      return (
        <>
          <View style={[styles.row, styles.distressHeader]}>
            <Ionicons name="warning" size={20} color="#d32f2f" />
            <Text style={styles.distressTitle}>ACTIVE DISTRESS</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>
              Victim: {distressDetails.user?.firstName ?? '?'} {distressDetails.user?.lastName ?? ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>Phone: {distressDetails.user?.phone ?? 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="water-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>Blood Type: {distressDetails.user?.bloodType ?? 'Unknown'}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="alert-circle-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>Emergency: {distressDetails.reason ?? 'Unknown'}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>
              Coordinates: {formatCoordinate(distressDetails.lat)},{' '}
              {formatCoordinate(distressDetails.lng)}
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>Activated: {formatDate(distressDetails.timestamp)}</Text>
          </View>
        </>
      );
    }

    return (
      <>
        <View style={styles.row}>
          <Ionicons name="people-outline" size={16} color={iconColor} />
          <Text style={styles.infoText}>Users connected: {node.users ?? 0}</Text>
        </View>
        <SignalIndicator node={node} color={iconColor} />
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color={iconColor} />
          <Text style={styles.infoText}>
            Coordinates: {formatCoordinate(node.latitude ?? node.lat)},{' '}
            {formatCoordinate(node.longitude ?? node.lng)}
          </Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={iconColor} />
          <Text style={styles.infoText}>Last seen: {formatDate(node.lastSeen)}</Text>
        </View>
      </>
    );
  };

  return (
    <View style={[styles.card, { borderColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.nodeNumber, { color: titleColor }]}>
            Node {node.nodeNumber ?? node.id}
          </Text>
          <Text style={styles.nodeName}>{node.name}</Text>
        </View>
        <View style={styles.divider} />
        {renderContent()}
      </ScrollView>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    elevation: 8,
    borderWidth: 2,
    maxHeight: 400,
  },
  header: { marginBottom: 12 },
  nodeNumber: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  nodeName: { fontSize: 14, color: '#555' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  infoText: { fontSize: 14, color: '#333' },
  signalContent: { flex: 1, gap: 2 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signalLabel: { fontSize: 14, fontWeight: '600' },
  circleRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  signalCircle: { width: 8, height: 8, borderRadius: 4 },
  rssiText: { fontSize: 11, color: '#999', marginTop: 1 },
  distressHeader: { marginBottom: 10 },
  distressTitle: { fontSize: 16, fontWeight: '700', color: '#d32f2f', marginLeft: 4 },
  distressText: { fontSize: 14, color: '#333', flex: 1 },
  staleText: { fontSize: 14, color: '#888', flex: 1 },
  closeButton: { marginTop: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8 },
  closeButtonText: { color: '#1e88e5', fontWeight: '500' },
});

export default NodeInfoCard;