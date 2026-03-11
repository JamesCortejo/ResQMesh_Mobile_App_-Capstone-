import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MeshNode {
  id: string;
  nodeNumber: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string; // 'active' or 'offline' (from backend)
  users: number;
  signal: string;
  distress: boolean;
  lastSeen?: string; // ISO string
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
    age: number;
  };
}

interface NodeInfoCardProps {
  node: MeshNode;
  distressDetails: DistressDetail | null;
  active?: boolean; // if not provided, fallback to node.status === 'active'
  onClose: () => void;
}

const NodeInfoCard: React.FC<NodeInfoCardProps> = ({
  node,
  distressDetails,
  active,
  onClose,
}) => {
  // Determine if node is considered online based on active prop (from lastSeen)
  const isActive = active !== undefined ? active : node.status === 'active';

  // Choose colours based on state
  let borderColor = '#e0e0e0';
  let iconColor = '#1e88e5';
  let titleColor = '#111';

  if (!isActive) {
    // Inactive node (gray)
    borderColor = '#9e9e9e';
    iconColor = '#9e9e9e';
    titleColor = '#9e9e9e';
  } else if (node.distress) {
    // Active and in distress (red)
    borderColor = '#d32f2f';
    iconColor = '#d32f2f';
    titleColor = '#d32f2f';
  } else {
    // Active normal (blue)
    borderColor = '#1e88e5';
    iconColor = '#1e88e5';
    titleColor = '#1e88e5';
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderContent = () => {
    // ----- INACTIVE NODE -----
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
              Last seen: {node.lastSeen ? formatDate(node.lastSeen) : 'Unknown'}
            </Text>
          </View>

          {/* If there is distress information, show it but mark as stale */}
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
                  Victim: {distressDetails.user.firstName} {distressDetails.user.lastName}
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="call-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>Phone: {distressDetails.user.phone}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="alert-circle-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>Emergency: {distressDetails.reason}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="time-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>
                  Reported: {formatDate(distressDetails.timestamp)}
                </Text>
              </View>
            </>
          )}
        </>
      );
    }

    // ----- ACTIVE NODE -----
    if (node.distress) {
      // Distressed state (requires distressDetails)
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
              Victim: {distressDetails.user.firstName} {distressDetails.user.lastName}
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>Phone: {distressDetails.user.phone}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="water-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>Blood Type: {distressDetails.user.bloodType || 'Unknown'}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="alert-circle-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>Emergency: {distressDetails.reason}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>
              Coordinates: {distressDetails.lat.toFixed(5)}, {distressDetails.lng.toFixed(5)}
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>
              Activated: {formatDate(distressDetails.timestamp)}
            </Text>
          </View>
        </>
      );
    }

    // Active normal state
    return (
      <>
        <View style={styles.row}>
          <Ionicons name="people-outline" size={16} color="#1e88e5" />
          <Text style={styles.infoText}>Users connected: {node.users}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="wifi-outline" size={16} color="#1e88e5" />
          <Text style={styles.infoText}>Signal strength: {node.signal}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color="#1e88e5" />
          <Text style={styles.infoText}>
            Coordinates: {node.latitude.toFixed(5)}, {node.longitude.toFixed(5)}
          </Text>
        </View>
        {node.lastSeen && (
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color="#1e88e5" />
            <Text style={styles.infoText}>Last seen: {formatDate(node.lastSeen)}</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={[styles.card, { borderColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.nodeNumber, { color: titleColor }]}>Node {node.nodeNumber}</Text>
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    elevation: 8,
    borderWidth: 2,
    maxHeight: 400,
  },
  header: {
    marginBottom: 12,
  },
  nodeNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  nodeName: {
    fontSize: 14,
    color: '#555',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  distressHeader: {
    marginBottom: 10,
  },
  distressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d32f2f',
    marginLeft: 4,
  },
  distressText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  staleText: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#1e88e5',
    fontWeight: '500',
  },
});

export default NodeInfoCard;