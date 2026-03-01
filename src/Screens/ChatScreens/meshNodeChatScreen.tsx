import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../navigations/appNavigations';

type NavProp = StackNavigationProp<RootStackParamList, 'MeshNodeChat'>;
type MeshNodeChatRouteProp = RouteProp<RootStackParamList, 'MeshNodeChat'>;

interface Props {
  navigation: NavProp;
}

const messages = [
  { id: '1', text: 'Anyone here?', sender: 'other', name: 'Civilian 12' },
  { id: '2', text: 'Yes, we are responding.', sender: 'me' },
];

const MeshNodeChatScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<MeshNodeChatRouteProp>();
  const { nodeName, users } = route.params;

  const renderMessage = ({ item }: any) => (
    <View
      style={[
        styles.messageWrapper,
        item.sender === 'me' ? styles.alignRight : styles.alignLeft,
      ]}
    >
      {item.sender !== 'me' && (
        <Text style={styles.senderName}>{item.name}</Text>
      )}
      <View
        style={[
          styles.messageBubble,
          item.sender === 'me' ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.sender === 'me' && styles.myMessageText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
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

      {/* CHAT + INPUT */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatArea}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* INPUT BAR */}
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
          />
          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  }
});

export default MeshNodeChatScreen;