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

interface NodeInfoCardProps {
  node: MeshNode;
  distressDetails: DistressDetail | null;
  active?: boolean;
  onClose: () => void;
}

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
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString();
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
                  Victim: {distressDetails.user?.firstName ?? '?'}{' '}
                  {distressDetails.user?.lastName ?? ''}
                </Text>
              </View>

              <View style={styles.row}>
                <Ionicons name="call-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>
                  Phone: {distressDetails.user?.phone ?? 'N/A'}
                </Text>
              </View>

              <View style={styles.row}>
                <Ionicons name="alert-circle-outline" size={16} color="#9e9e9e" />
                <Text style={styles.staleText}>
                  Emergency: {distressDetails.reason ?? 'Unknown'}
                </Text>
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

    if (node.distress) {
      if (!distressDetails) {
        return (
          <View style={styles.row}>
            <Ionicons name="alert-circle-outline" size={16} color="#d32f2f" />
            <Text style={[styles.infoText, { color: '#d32f2f' }]}>
              Loading distress details...
            </Text>
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
              Victim: {distressDetails.user?.firstName ?? '?'}{' '}
              {distressDetails.user?.lastName ?? ''}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="call-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>
              Phone: {distressDetails.user?.phone ?? 'N/A'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="water-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>
              Blood Type: {distressDetails.user?.bloodType ?? 'Unknown'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="alert-circle-outline" size={16} color="#d32f2f" />
            <Text style={styles.distressText}>
              Emergency: {distressDetails.reason ?? 'Unknown'}
            </Text>
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
            <Text style={styles.distressText}>
              Activated: {formatDate(distressDetails.timestamp)}
            </Text>
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

        <View style={styles.row}>
          <Ionicons name="wifi-outline" size={16} color={iconColor} />
          <Text style={styles.infoText}>
            Signal strength: {node.signal ?? 'N/A'}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color={iconColor} />
          <Text style={styles.infoText}>
            Coordinates: {formatCoordinate(node.latitude ?? node.lat)},{' '}
            {formatCoordinate(node.longitude ?? node.lng)}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={iconColor} />
          <Text style={styles.infoText}>
            Last seen: {formatDate(node.lastSeen)}
          </Text>
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