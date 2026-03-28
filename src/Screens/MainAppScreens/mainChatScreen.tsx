import React, { useState, useCallback, useEffect, useRef, memo } from 'react'
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import MainLayout from '../../layouts/MainLayout'
import WelcomeCard from '../../components/WelcomeCard'
import { MeshNode } from '../../types/MeshNode'
import { useRootNavigation } from '../../hooks/useRootNavigation'
import api from '../../services/api'
import { NODE_INACTIVE_TIMEOUT_MS } from '../../constants/timeouts'

type MeshNodeWithSignal = MeshNode & {
  signal?: number | string | null
}

const MainChatScreen = memo(() => {
  const rootNavigation = useRootNavigation()

  const [nodes, setNodes] = useState<MeshNodeWithSignal[]>([])
  const [connectedNodeId, setConnectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false
        })
      ])
    ).start()
  }, [glowAnim])

  const isNodeActive = (node: MeshNodeWithSignal) => {
    if (node.id === connectedNodeId) return true
    if (!node.lastSeen) return false
    const lastSeen = new Date(node.lastSeen).getTime()
    return Date.now() - lastSeen < NODE_INACTIVE_TIMEOUT_MS
  }

  const formatDistance = (meters?: number | null) => {
    if (meters === null || meters === undefined) return 'N/A'
    if (meters < 1) return 'Here'
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(2)} km`
  }

  const getRawSignal = (node: MeshNodeWithSignal): number | null => {
    const raw = node.signal
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw === 'string') {
      const parsed = Number(raw)
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed
    }
    return null
  }

  const getSignalLevel = (node: MeshNodeWithSignal) => {
    if (node.id === connectedNodeId) return 4

    const rawSignal = getRawSignal(node)

    // If backend ever returns a real signal value, use it.
    if (rawSignal !== null) {
      if (rawSignal >= -70) return 4
      if (rawSignal >= -85) return 3
      if (rawSignal >= -100) return 2
      return 1
    }

    // Otherwise compute a stable "signal quality" from freshness + distance.
    if (!node.lastSeen) return 0

    const ageMs = Date.now() - new Date(node.lastSeen).getTime()
    if (ageMs > 30000) return 0

    let freshness = 1
    if (ageMs > 20000) freshness = 0.4
    else if (ageMs > 10000) freshness = 0.7

    let distanceScore = 1
    if (node.distanceMeters !== null && node.distanceMeters !== undefined) {
      if (node.distanceMeters > 2000) distanceScore = 0.2
      else if (node.distanceMeters > 1000) distanceScore = 0.5
      else if (node.distanceMeters > 300) distanceScore = 0.8
    }

    const score = freshness * distanceScore

    if (score > 0.8) return 4
    if (score > 0.6) return 3
    if (score > 0.3) return 2
    return 1
  }

  const getSignalColor = (level: number) => {
    switch (level) {
      case 4: return '#2ecc71'
      case 3: return '#f1c40f'
      case 2: return '#e67e22'
      case 1: return '#e74c3c'
      default: return '#999'
    }
  }

  const getSignalLabel = (level: number) => {
    switch (level) {
      case 4: return 'Excellent'
      case 3: return 'Good'
      case 2: return 'Weak'
      case 1: return 'Poor'
      default: return 'No Signal'
    }
  }

  const renderSignalCircles = (node: MeshNodeWithSignal) => {
    if (node.id === connectedNodeId) {
      return (
        <View style={styles.signalWrapper}>
          <Ionicons name="radio-outline" size={14} color="#4caf50" />
          <Text style={[styles.info, { color: '#4caf50', fontWeight: '600' }]}>
            Connected
          </Text>
        </View>
      )
    }

    const level = getSignalLevel(node)
    const color = getSignalColor(level)

    return (
      <View style={styles.signalWrapper}>
        <Ionicons name="radio-outline" size={14} color="#666" />
        <Text style={styles.info}>{getSignalLabel(level)}</Text>
        <View style={styles.circleRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.signalCircle,
                { backgroundColor: i < level ? color : '#ddd' }
              ]}
            />
          ))}
        </View>
      </View>
    )
  }

  const loadNodes = useCallback(async () => {
    try {
      const statusRes = await api.get('/api/status', { timeout: 3000 })
      const localNodeId = statusRes.data.node_id
      setConnectedNodeId(localNodeId)

      const nodesRes = await api.get('/api/nodes')
      const allNodes: MeshNodeWithSignal[] = nodesRes.data.map((node: any) => ({
        ...node,
        distress: node.distress === true,
        distanceMeters: node.distanceMeters ?? null,
        signal: node.signal ?? null
      }))

      allNodes.sort((a, b) => {
        if (a.id === localNodeId) return -1
        if (b.id === localNodeId) return 1
        return 0
      })

      setNodes(allNodes)
      setError(null)
    } catch (err) {
      console.log('loadNodes error', err)
      setError('Cannot connect to mesh')
    }
  }, [])

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const response = await api.get('/api/messages/unread')
      setUnreadCounts(response.data)
    } catch (err) {
      console.error('Failed to fetch unread counts', err)
    }
  }, [])

  const initialLoad = useCallback(async () => {
    setLoading(true)
    await loadNodes()
    await fetchUnreadCounts()
    setLoading(false)
  }, [loadNodes, fetchUnreadCounts])

  useEffect(() => {
    initialLoad()
    const interval = setInterval(() => {
      loadNodes()
      fetchUnreadCounts()
    }, 10000)
    return () => clearInterval(interval)
  }, [initialLoad, loadNodes, fetchUnreadCounts])

  useFocusEffect(
    useCallback(() => {
      loadNodes()
      fetchUnreadCounts()
    }, [loadNodes, fetchUnreadCounts])
  )

  const broadcastNode: MeshNodeWithSignal = {
    id: 'BROADCAST',
    name: 'Broadcast Channel',
    users: 0,
    distress: false,
    lastSeen: new Date().toISOString(),
    signal: null,
    distanceMeters: null
  }

  const data = [broadcastNode, ...nodes]

  const renderNode = ({ item }: { item: MeshNodeWithSignal }) => {
    if (!item) return null

    const isBroadcast = item.id === 'BROADCAST'
    const active = isBroadcast ? true : isNodeActive(item)
    const isConnected = item.id === connectedNodeId

    let stateLabel = ''
    let stateColor = ''

    if (!active) {
      stateLabel = 'INACTIVE'
      stateColor = '#9e9e9e'
    } else if (item.distress) {
      stateLabel = 'DISTRESS'
      stateColor = '#d32f2f'
    } else {
      stateLabel = 'ACTIVE'
      stateColor = '#4caf50'
    }

    const animatedBackground = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,0,0,0.05)', 'rgba(255,0,0,0.22)']
    })

    const handlePress = () => {
      if (!active && !isBroadcast) {
        Alert.alert('Mesh Node Inactive', 'This mesh node is inactive.')
        return
      }

      rootNavigation.navigate('MeshNodeChat', {
        nodeId: item.id,
        nodeName: item.name,
        users: item.users ?? 0
      })
    }

    const unreadCount = unreadCounts[item.id] || 0

    return (
      <Animated.View
        style={[
          styles.card,
          item.distress && !isBroadcast && { backgroundColor: animatedBackground },
          isConnected && styles.connectedCard,
          !active && !isBroadcast && styles.inactiveCard
        ]}
      >
        <TouchableOpacity style={styles.cardContent} onPress={handlePress}>
          <View style={styles.content}>
            <View style={styles.nameRow}>
              <Ionicons
                name={isBroadcast ? 'megaphone' : 'hardware-chip-outline'}
                size={16}
                color={isBroadcast ? '#007aff' : '#333'}
              />
              <Text style={styles.nodeId}> {item.id}</Text>
              <Text style={styles.name}> - {item.name}</Text>
              {!isBroadcast && (
                <View style={[styles.stateBadge, { backgroundColor: stateColor }]}>
                  <Text style={styles.stateText}>{stateLabel}</Text>
                </View>
              )}
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.row}>
              {!isBroadcast ? (
                <>
                  <Ionicons name="people-outline" size={14} color="#666" />
                  <Text style={styles.info}>{item.users ?? 0}</Text>
                  <Text style={styles.separator}>|</Text>
                  {renderSignalCircles(item)}
                  <Text style={styles.separator}>|</Text>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.info}>
                    {formatDistance(item.distanceMeters)}
                  </Text>
                </>
              ) : (
                <Text style={styles.info}>Send a message to all nodes</Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color="#bbb" />
        </TouchableOpacity>
      </Animated.View>
    )
  }

  if (loading) {
    return (
      <MainLayout activeTab="chat">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e88e5" />
          <Text style={styles.loadingText}>Connecting to mesh...</Text>
        </View>
      </MainLayout>
    )
  }

  if (error && nodes.length === 0) {
    return (
      <MainLayout activeTab="chat">
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color="#aaa" />
          <Text style={styles.errorText}>Not connected to mesh</Text>
        </View>
      </MainLayout>
    )
  }

  return (
    <MainLayout activeTab="chat">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderNode}
        ListHeaderComponent={<WelcomeCard />}
      />
    </MainLayout>
  )
})

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: '#fff'
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  connectedCard: {
    borderWidth: 2,
    borderColor: '#4caf50'
  },
  inactiveCard: {
    opacity: 0.5
  },
  content: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6
  },
  nodeId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  name: {
    fontSize: 14,
    color: '#333'
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8
  },
  stateText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  unreadBadge: {
    backgroundColor: '#007aff',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  info: {
    fontSize: 13,
    color: '#666'
  },
  separator: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 4
  },
  signalWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  circleRow: {
    flexDirection: 'row',
    gap: 4
  },
  signalCircle: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  errorText: {
    marginTop: 10,
    fontSize: 16
  }
})

export default MainChatScreen