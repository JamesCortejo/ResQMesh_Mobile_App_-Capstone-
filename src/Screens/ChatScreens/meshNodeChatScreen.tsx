import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigations/appNavigations';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';


const MAX_MESSAGE_LENGTH = 150;

type NavProp = StackNavigationProp<RootStackParamList, 'MeshNodeChat'>;
type MeshNodeChatRouteProp = RouteProp<RootStackParamList, 'MeshNodeChat'>;

interface Props {
  navigation: NavProp;
}

interface Message {
  id: number;
  code: string;
  senderId: number | null;
  senderCode: string;
  senderName: string;
  content: string;
  type: string;
  timestamp: string;
  status: string;
}

const MeshNodeChatScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<MeshNodeChatRouteProp>();
  const { nodeId, nodeName, users } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nodeOnline, setNodeOnline] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  const isBroadcast = nodeId === 'BROADCAST';

  const fetchMessages = useCallback(async (showRefreshing = false) => {
    if (!nodeId) return;
    try {
      setError(null);
      if (showRefreshing) setRefreshing(true);
      const response = await api.get(`/api/messages/${nodeId}`);
      setMessages(response.data);
    } catch (err: any) {
      console.error('Failed to fetch messages', err);
      setError('Could not load messages. Please try again.');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [fetchMessages])
  );

  useFocusEffect(
    useCallback(() => {
      const markAsRead = async () => {
        try {
          await api.post(`/api/messages/read/${nodeId}`);
        } catch (err) {
          console.error('Failed to mark messages as read', err);
        }
      };
      markAsRead();
    }, [nodeId])
  );

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Simulate node online status – replace with real check (skip for broadcast)
  useEffect(() => {
    if (isBroadcast) return;
    const interval = setInterval(() => {
      setNodeOnline(Math.random() > 0.2);
    }, 5000);
    return () => clearInterval(interval);
  }, [isBroadcast]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || sending) return;

    setSending(true);
    const tempId = Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      code: '',
      senderId: user?.id || null,
      senderCode: user?.code || '',
      senderName: user?.name || 'You',
      content: trimmed,
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'queued',
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');

    try {
      await api.post('/api/messages', {
        nodeId,
        content: trimmed,
        type: 'text',
      });
      await fetchMessages();
    } catch (err: any) {
      console.error('Failed to send message', err);
      const errorMsg = err.response?.data?.error || 'Could not send message. Please try again.';
      Alert.alert('Error', errorMsg);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleBroadcast = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || sending) return;

    Alert.alert(
      'Broadcast Message',
      'This message will be sent to ALL nodes in the mesh. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              await api.post('/api/messages/broadcast', {
                content: trimmed,
                type: 'broadcast',
              });
              setInputText('');
              Alert.alert('Broadcast Sent', 'Your message has been broadcast.');
              // If we are in broadcast channel, refresh to show own message
              if (isBroadcast) {
                await fetchMessages();
              }
            } catch (err: any) {
              console.error('Broadcast failed', err);
              const msg = err.response?.data?.error || 'Could not send broadcast.';
              Alert.alert('Error', msg);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  }, [inputText, sending, isBroadcast, fetchMessages]);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'queued':
        return <Text style={styles.statusText}>Sending...</Text>;
      case 'sent':
        return <Ionicons name="checkmark" size={14} color="#8e8e93" />;
      case 'delivered':
        return (
          <View style={{ flexDirection: 'row' }}>
            <Ionicons name="checkmark" size={14} color="#34c759" />
            <Ionicons name="checkmark" size={14} color="#34c759" style={{ marginLeft: -4 }} />
          </View>
        );
      default:
        return null;
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderCode === user?.code;
    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.alignRight : styles.alignLeft,
        ]}
      >
        {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isMe && styles.myTimestamp]}>
              {formatTime(item.timestamp)}
            </Text>
            {isMe && <View style={styles.statusContainer}>{renderStatus(item.status)}</View>}
          </View>
        </View>
      </View>
    );
  };

  const remainingChars = MAX_MESSAGE_LENGTH - inputText.length;
  const isOverLimit = inputText.length > MAX_MESSAGE_LENGTH;
  const counterColor = isOverLimit ? '#ff3b30' : remainingChars < 20 ? '#ff9500' : '#8e8e93';

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={28} color="#007aff" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.nodeTitle}>{nodeName}</Text>
        {!isBroadcast && (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: nodeOnline ? '#34c759' : '#ff3b30' }]} />
            <Text style={styles.nodeSubtitle}>
              {users} user{users !== 1 ? 's' : ''} • {nodeOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.headerButton} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading messages…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && messages.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff3b30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchMessages()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatArea}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => fetchMessages(true)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>
                {isBroadcast
                  ? 'Broadcast messages will appear here'
                  : 'Say hello to start the conversation'}
              </Text>
            </View>
          }
        />

        {!isBroadcast && (
          <View style={styles.inputContainer}>
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="add-circle-outline" size={28} color="#007aff" />
              </TouchableOpacity>

              {/* Broadcast button – shown only in regular chats */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleBroadcast}
                disabled={sending || !inputText.trim() || isOverLimit}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={22}
                  color={(!inputText.trim() || isOverLimit) ? '#ccc' : '#007aff'}
                />
              </TouchableOpacity>

              <TextInput
                placeholder="Message..."
                style={styles.input}
                placeholderTextColor="#8e8e93"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                editable={!sending}
                maxLength={MAX_MESSAGE_LENGTH * 2}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (sending || !inputText.trim() || isOverLimit) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={sending || !inputText.trim() || isOverLimit}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {inputText.length > 0 && (
              <View style={styles.counterContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(inputText.length / MAX_MESSAGE_LENGTH) * 100}%`,
                        backgroundColor: counterColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.counterText, { color: counterColor }]}>
                  {inputText.length}/{MAX_MESSAGE_LENGTH}
                </Text>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 4 : 4,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  headerButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  nodeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  nodeSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
  },
  chatArea: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  alignRight: {
    alignSelf: 'flex-end',
  },
  alignLeft: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    backgroundColor: '#007aff',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#e5e5ea',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  myMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#8e8e93',
    marginRight: 4,
  },
  myTimestamp: {
    color: '#cce4ff',
  },
  statusContainer: {
    marginLeft: 2,
  },
  statusText: {
    fontSize: 11,
    color: '#cce4ff',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  attachButton: {
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f2f2f7',
    borderRadius: 20,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007aff',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#b3d4ff',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#e5e5ea',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8e8e93',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#007aff',
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8e8e93',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#c6c6c8',
    marginTop: 4,
  },
});

export default MeshNodeChatScreen;