import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigations/appNavigations';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  startRecording,
  stopRecording,
  audioToBase64,
  sendVoiceMessage,
  cancelRecording,
} from '../../services/voiceService';
import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';

const MAX_MESSAGE_LENGTH = 130;
const MAX_VOICE_SECONDS = 10;

type NavProp = StackNavigationProp<RootStackParamList, 'MeshNodeChat'>;
type MeshNodeChatRouteProp = RouteProp<RootStackParamList, 'MeshNodeChat'>;

interface Props {
  navigation: NavProp;
}

type SenderRole = 'civilian' | 'rescuer' | 'unknown';

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
  senderRole?: string | null;
  senderType?: string | null;
  role?: string | null;
  sourceNodeId?: string | null;
  destinationNodeId?: string | null;
}

const getSourceNodeFromUserCode = (userCode: string): string | null => {
  const match = userCode?.match(/[A-Z]{2}\d{3}(.+)$/);
  return match ? match[1] : null;
};

// ---------------------------
// Waveform Component
// ---------------------------
const Waveform = ({ isPlaying, seed }: { isPlaying: boolean; seed: number }) => {
  const bars = useMemo(() => {
    const random = (min: number, max: number, idx: number) => {
      const x = Math.sin(seed + idx) * 10000;
      return min + (Math.abs(x) % (max - min));
    };
    return Array.from({ length: 20 }, (_, i) => random(5, 25, i));
  }, [seed]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {bars.map((height, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height,
            backgroundColor: isPlaying ? '#4CAF50' : '#888',
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
};

// ---------------------------
// Main Screen
// ---------------------------
const MeshNodeChatScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<MeshNodeChatRouteProp>();
  const { nodeId, nodeName, users } = route.params;
  const { user } = useAuth();

  const [localNodeId, setLocalNodeId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nodeOnline, setNodeOnline] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);

  const [durations, setDurations] = useState<Record<number, number>>({});

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmText, setModalConfirmText] = useState('OK');
  const [modalOnConfirm, setModalOnConfirm] = useState<(() => void) | null>(null);
  const [modalCancelText, setModalCancelText] = useState<string | null>(null);
  const [modalOnCancel, setModalOnCancel] = useState<(() => void) | null>(null);

  // Voice sending progress modal
  const [voiceProgressVisible, setVoiceProgressVisible] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  const flatListRef = useRef<FlatList<Message>>(null);
  const playbackSoundRef = useRef<Audio.Sound | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Ref-based recording flag — never stale inside timer callbacks
  const isRecordingRef = useRef(false);

  const loadingDurationIds = useRef(new Set<number>());

  const isBroadcast = nodeId === 'BROADCAST';

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // Fetch local node id once
  useEffect(() => {
    const loadLocalNode = async () => {
      try {
        const response = await api.get('/api/status', { timeout: 3000 });
        setLocalNodeId(response.data?.node_id ?? null);
      } catch (error) {
        console.log('Failed to load local node id:', error);
      }
    };
    loadLocalNode();
  }, []);

  // ---------- Modal helpers ----------
  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalConfirmText('OK');
    setModalCancelText(null);
    setModalOnConfirm(() => () => setModalVisible(false));
    setModalOnCancel(null);
    setModalVisible(true);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalConfirmText('Send');
    setModalCancelText('Cancel');
    setModalOnConfirm(() => () => {
      setModalVisible(false);
      onConfirm();
    });
    setModalOnCancel(() => () => setModalVisible(false));
    setModalVisible(true);
  };

  const normalizeRole = (value?: string | null): SenderRole => {
    const v = String(value ?? '').trim().toLowerCase();
    if (v === 'civilian' || v === 'civ' || v === 'user') return 'civilian';
    if (v === 'rescuer' || v === 'rescue' || v === 'responder') return 'rescuer';
    return 'unknown';
  };

  const getCurrentUserRole = (): SenderRole => {
    const rawRole =
      (user as any)?.role ??
      (user as any)?.userType ??
      (user as any)?.accountType ??
      (user as any)?.type ??
      null;
    return normalizeRole(rawRole);
  };

  const getDisplayRole = (item: Message, isMe: boolean): SenderRole => {
    const explicitRole = normalizeRole(
      item.senderRole ?? item.senderType ?? item.role ?? null
    );
    if (explicitRole !== 'unknown') return explicitRole;
    if (isMe) {
      const currentUserRole = getCurrentUserRole();
      if (currentUserRole !== 'unknown') return currentUserRole;
    }
    return 'unknown';
  };

  const getRoleLabel = (role: SenderRole) => {
    if (role === 'rescuer') return '(Rescuer)';
    if (role === 'civilian') return '(Civilian)';
    return '(Unknown)';
  };

  // ---------- Duration Loading for Voice Messages ----------
  const loadDuration = useCallback(
    async (item: Message) => {
      if (item.type !== 'voice') return;
      if (item.id in durations) return;
      if (loadingDurationIds.current.has(item.id)) return;

      loadingDurationIds.current.add(item.id);

      try {
        const file = new File(Paths.cache, `voice_${item.id}.m4a`);
        await file.write(item.content, { encoding: 'base64' });

        const { sound, status } = await Audio.Sound.createAsync(
          { uri: file.uri },
          { shouldPlay: false }
        );

        if (status.isLoaded && typeof status.durationMillis === 'number') {
          const duration = status.durationMillis;
          setDurations((prev) => ({ ...prev, [item.id]: duration }));
        }

        await sound.unloadAsync();
      } catch (e) {
        console.log('Duration load error:', e);
      } finally {
        loadingDurationIds.current.delete(item.id);
      }
    },
    [durations]
  );

  useEffect(() => {
    const voiceMessages = messages.filter((m) => m.type === 'voice');
    for (const msg of voiceMessages) loadDuration(msg);
  }, [messages, loadDuration]);

  // ---------- Lifecycle Cleanup ----------
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (playbackSoundRef.current) playbackSoundRef.current.unloadAsync().catch(() => {});
      cancelRecording().catch(() => {});
    };
  }, []);

  // ---------- Fetch Messages ----------
  const fetchMessages = useCallback(
    async (showRefreshing = false) => {
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

        setTimeout(() => {
          scrollToBottom(false);
        }, 150);
      }
    },
    [nodeId, scrollToBottom]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();

      const timer = setTimeout(() => {
        scrollToBottom(false);
      }, 200);

      return () => clearTimeout(timer);
    }, [fetchMessages, scrollToBottom])
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
    const timer = setTimeout(() => {
      scrollToBottom(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isBroadcast) return;
    const interval = setInterval(() => setNodeOnline(Math.random() > 0.2), 5000);
    return () => clearInterval(interval);
  }, [isBroadcast]);

  // ---------- Audio Playback ----------
  const stopCurrentPlayback = useCallback(async () => {
    if (playbackSoundRef.current) {
      try {
        await playbackSoundRef.current.unloadAsync();
      } catch (e) {
        console.warn('Playback cleanup failed', e);
      }
      playbackSoundRef.current = null;
    }
    setPlayingMessageId(null);
  }, []);

  const playVoiceMessage = async (item: Message) => {
    try {
      if (playingMessageId === item.id) {
        await stopCurrentPlayback();
        return;
      }
      await stopCurrentPlayback();
      if (!item.content) return;

      const file = new File(Paths.cache, `voice_${item.id}.m4a`);
      await file.write(item.content, { encoding: 'base64' });

      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true }
      );

      playbackSoundRef.current = sound;
      setPlayingMessageId(item.id);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          stopCurrentPlayback().catch(() => {});
        }
      });
    } catch (error) {
      console.error('Voice playback failed:', error);
      showAlert('Playback error', 'Could not play this voice clip.');
    }
  };

  // ---------- Voice Recording — tap to start/stop, auto-stop at 10s ----------

  const finishVoiceRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;

    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setSendingVoice(true);
    setVoiceProgressVisible(true);
    setProgressMessage('Encoding voice...');

    try {
      const uri = await stopRecording();
      setProgressMessage('Preparing audio...');
      const base64 = await audioToBase64(uri);
      setProgressMessage('Sending voice message...');
      await sendVoiceMessage(nodeId, base64);
      await fetchMessages();
    } catch (error: any) {
      console.error('Stop/send recording failed:', error);
      showAlert(
        'Voice message failed',
        error.response?.data?.error || 'Could not send the voice message.'
      );
      try {
        await cancelRecording();
      } catch {}
    } finally {
      setSendingVoice(false);
      setRecordingSeconds(0);
      setVoiceProgressVisible(false);
      setProgressMessage('');
      setTimeout(() => {
        scrollToBottom(false);
      }, 150);
    }
  }, [fetchMessages, nodeId, scrollToBottom]);

  const startVoiceRecording = useCallback(async () => {
    if (isRecordingRef.current || sending || sendingVoice) return;

    try {
      await stopCurrentPlayback();
      await startRecording();

      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      autoStopTimerRef.current = setTimeout(() => {
        finishVoiceRecording();
      }, MAX_VOICE_SECONDS * 1000);
    } catch (error) {
      console.error('Start recording failed:', error);
      showAlert('Recording error', 'Could not start voice recording.');
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [sending, sendingVoice, stopCurrentPlayback, finishVoiceRecording]);

  const handleMicTap = useCallback(() => {
    if (isRecordingRef.current) {
      finishVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }, [startVoiceRecording, finishVoiceRecording]);

  // ---------- Text Messaging ----------
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || sending || isRecording || sendingVoice) return;

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
      sourceNodeId: localNodeId,
      destinationNodeId: nodeId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');

    try {
      await api.post('/api/messages', { nodeId, content: trimmed, type: 'text' });
      await fetchMessages();
    } catch (err: any) {
      console.error('Failed to send message', err);
      const errorMsg = err.response?.data?.error || 'Could not send message. Please try again.';
      showAlert('Error', errorMsg);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setSending(false);
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
  };

  const handleBroadcast = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || sending) return;

    showConfirm(
      'Broadcast Message',
      'This message will be sent to ALL nodes in the mesh. Continue?',
      async () => {
        setSending(true);
        try {
          await api.post('/api/messages/broadcast', { content: trimmed, type: 'broadcast' });
          setInputText('');
          showAlert('Broadcast Sent', 'Your message has been broadcast.');
          if (isBroadcast) await fetchMessages();
        } catch (err: any) {
          console.error('Broadcast failed', err);
          showAlert('Error', err.response?.data?.error || 'Could not send broadcast.');
        } finally {
          setSending(false);
          setTimeout(() => {
            scrollToBottom(true);
          }, 100);
        }
      }
    );
  }, [inputText, sending, isBroadcast, fetchMessages, scrollToBottom]);

  // ---------- Helpers ----------
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDurationMs = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const formatDurationSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
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

  // ---------- Message Rendering ----------
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderCode === user?.code;
    const displayRole = getDisplayRole(item, isMe);

    const sourceNode =
      !isMe
        ? item.sourceNodeId || getSourceNodeFromUserCode(item.senderCode)
        : null;

    const bubbleStyle =
      displayRole === 'rescuer'
        ? styles.rescuerMessage
        : displayRole === 'civilian'
        ? styles.civilianMessage
        : styles.unknownMessage;

    const roleTagStyle =
      displayRole === 'rescuer'
        ? styles.rescuerRoleTag
        : displayRole === 'civilian'
        ? styles.civilianRoleTag
        : styles.unknownRoleTag;

    return (
      <View style={[styles.messageWrapper, isMe ? styles.alignRight : styles.alignLeft]}>
        <Text style={styles.senderNameRow}>
          <Text style={styles.senderName}>{item.senderName}</Text>
          <Text style={[styles.roleTag, roleTagStyle]}> {getRoleLabel(displayRole)}</Text>
          {sourceNode && sourceNode !== 'BROADCAST' && (
            <Text style={styles.sourceNodeTag}> from {sourceNode}</Text>
          )}
        </Text>

        <View style={[styles.messageBubble, bubbleStyle]}>
          {item.type === 'voice' ? (
            <TouchableOpacity
              style={styles.voiceRow}
              onPress={() => playVoiceMessage(item)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={playingMessageId === item.id ? 'stop-circle-outline' : 'play-circle-outline'}
                size={24}
                color="#fff"
              />
              <Waveform isPlaying={playingMessageId === item.id} seed={item.id} />
              <Text style={styles.voiceDuration}>
                {durations[item.id] ? formatDurationMs(durations[item.id]) : '...'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.messageText}>{item.content}</Text>
          )}

          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
            {isMe && <View style={styles.statusContainer}>{renderStatus(item.status)}</View>}
          </View>
        </View>
      </View>
    );
  };

  const clampedLength = Math.min(inputText.length, MAX_MESSAGE_LENGTH);
  const progressPercent = Math.min((clampedLength / MAX_MESSAGE_LENGTH) * 100, 100);
  const remainingChars = MAX_MESSAGE_LENGTH - clampedLength;
  const counterColor = remainingChars < 20 ? '#ff9500' : '#8e8e93';

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
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollToBottom(false);
            }, 100);
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>
                {isBroadcast
                  ? 'Broadcast messages will appear here'
                  : 'Tap the mic button to record a voice clip'}
              </Text>
            </View>
          }
        />

        {!isBroadcast && (
          <View style={styles.inputContainer}>
            {isRecording && (
              <View style={styles.recordingBar}>
                <Ionicons name="radio-outline" size={18} color="#d32f2f" />
                <Text style={styles.recordingText}>
                  Recording... {formatDurationSec(recordingSeconds)}
                </Text>
                <Text style={styles.autoStopWarning}>
                  Auto-stop in {Math.max(0, MAX_VOICE_SECONDS - recordingSeconds)}s
                </Text>
              </View>
            )}

            <View style={styles.inputBar}>
              <TouchableOpacity
                style={[
                  styles.broadcastButton,
                  (!inputText.trim() || inputText.length > MAX_MESSAGE_LENGTH || isRecording || sendingVoice) &&
                    styles.broadcastButtonDisabled,
                ]}
                onPress={handleBroadcast}
                disabled={sending || !inputText.trim() || inputText.length > MAX_MESSAGE_LENGTH || isRecording || sendingVoice}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={20}
                  color={
                    (!inputText.trim() || inputText.length > MAX_MESSAGE_LENGTH || isRecording || sendingVoice)
                      ? '#b0b0b0'
                      : '#007aff'
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.micButton,
                  (isRecording || sendingVoice) && styles.micButtonRecording,
                ]}
                onPress={handleMicTap}
                disabled={sending || sendingVoice}
                activeOpacity={0.8}
              >
                {sendingVoice ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color="#fff" />
                )}
              </TouchableOpacity>

              <TextInput
                placeholder="Message..."
                style={styles.input}
                placeholderTextColor="#8e8e93"
                value={inputText}
                onChangeText={(text) => {
                  const limited = text.slice(0, MAX_MESSAGE_LENGTH);
                  setInputText(limited);
                }}
                onSubmitEditing={handleSend}
                editable={!sending && !isRecording && !sendingVoice}
                maxLength={MAX_MESSAGE_LENGTH}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (sending || !inputText.trim() || inputText.length > MAX_MESSAGE_LENGTH || isRecording || sendingVoice) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={sending || !inputText.trim() || inputText.length > MAX_MESSAGE_LENGTH || isRecording || sendingVoice}
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
                        width: `${progressPercent}%`,
                        backgroundColor: remainingChars < 20 ? '#ff9500' : '#e53935',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.counterText, { color: counterColor }]}>
                  {clampedLength}/{MAX_MESSAGE_LENGTH}
                </Text>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalButtons}>
              {modalCancelText && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => modalOnCancel?.()}
                >
                  <Text style={styles.modalButtonText}>{modalCancelText}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={() => modalOnConfirm?.()}
              >
                <Text style={styles.modalButtonText}>{modalConfirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={voiceProgressVisible}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.progressModalContainer}>
            <ActivityIndicator size="large" color="#007aff" />
            <Text style={styles.progressModalText}>
              {progressMessage || 'Sending voice message...'}
            </Text>
          </View>
        </View>
      </Modal>
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
  senderNameRow: {
    marginLeft: 12,
    marginBottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  senderName: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '600',
  },
  roleTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  civilianRoleTag: {
    color: '#007aff',
  },
  rescuerRoleTag: {
    color: '#ff3624',
  },
  unknownRoleTag: {
    color: '#8e8e93',
  },
  sourceNodeTag: {
    fontSize: 11,
    color: '#888',
    marginLeft: 6,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
  },
  civilianMessage: {
    backgroundColor: '#007aff',
    borderBottomRightRadius: 4,
  },
  rescuerMessage: {
    backgroundColor: '#ff3624',
    borderBottomRightRadius: 4,
  },
  unknownMessage: {
    backgroundColor: '#8e8e93',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
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
    color: '#cce4ff',
    marginRight: 4,
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
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  recordingText: {
    color: '#d32f2f',
    fontWeight: '600',
    fontSize: 13,
  },
  autoStopWarning: {
    color: '#ff9500',
    fontSize: 12,
    marginLeft: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  broadcastButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginRight: 6,
  },
  broadcastButtonDisabled: {
    backgroundColor: '#f0f0f0',
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
    marginLeft: 6,
  },
  micButton: {
    backgroundColor: '#d32f2f',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginRight: 6,
  },
  micButtonRecording: {
    backgroundColor: '#8b0000',
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
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 48,
    textAlign: 'right',
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
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 140,
  },
  voiceDuration: {
    fontSize: 12,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalConfirmButton: {
    backgroundColor: '#007aff',
  },
  modalCancelButton: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  progressModalContainer: {
    width: '70%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  progressModalText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default MeshNodeChatScreen;