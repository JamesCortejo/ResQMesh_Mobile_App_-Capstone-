import React, { useState, useCallback, useEffect } from 'react';
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

  const fetchMessages = useCallback(async () => {
    if (!nodeId) return;
    try {
      setError(null);
      const response = await api.get(`/api/messages/${nodeId}`);
      setMessages(response.data);
    } catch (err: any) {
      console.error('Failed to fetch messages', err);
      setError('Could not load messages. Please try again.');
    } finally {
      setLoading(false);
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

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await api.post('/api/messages', {
        nodeId,
        content: inputText.trim(),
        type: 'text',
      });
      setInputText('');
      await fetchMessages();
    } catch (err: any) {
      console.error('Failed to send message', err);
      // Extract error message from backend response
      const errorMsg = err.response?.data?.error || 'Could not send message. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSending(false);
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
          <Text
            style={[
              styles.messageText,
              isMe && styles.myMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e88e5" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.nodeTitle}>{nodeName}</Text>
            <Text style={styles.nodeSubtitle}>{users} users connected</Text>
          </View>
          <Ionicons name="ellipsis-vertical" size={20} color="#777" />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e88e5" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e88e5" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.nodeTitle}>{nodeName}</Text>
            <Text style={styles.nodeSubtitle}>{users} users connected</Text>
          </View>
          <Ionicons name="ellipsis-vertical" size={20} color="#777" />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e88e5" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.nodeTitle}>{nodeName}</Text>
          <Text style={styles.nodeSubtitle}>{users} users connected</Text>
        </View>
        <Ionicons name="ellipsis-vertical" size={20} color="#777" />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatArea}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="mic-outline" size={22} color="#777" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="megaphone-outline" size={22} color="#777" />
          </TouchableOpacity>
          <TextInput
            placeholder="Message..."
            style={styles.input}
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 0) + 12
        : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  nodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  nodeSubtitle: {
    fontSize: 13,
    color: '#777',
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
    color: '#777',
    marginBottom: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 14,
  },
  myMessage: {
    backgroundColor: '#1e88e5',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#111',
  },
  myMessageText: {
    color: '#fff',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e3e3e3',
  },
  iconButton: {
    paddingHorizontal: 6,
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    fontSize: 14,
    color: '#111',
  },
  sendButton: {
    backgroundColor: '#1e88e5',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#a0c4f0',
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
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#1e88e5',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MeshNodeChatScreen;