// src/screen/Ragman/RagmanChatScreen.jsx
// Professional chat interface for ragman-customer communication with Sendbird integration
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  Alert,
  Linking,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CHAT_INITIATE_API,
  CHAT_SEND_MESSAGE_API,
  CHAT_GET_MESSAGES_API,
  CHAT_MARK_AS_READ_API,
} from '../../config';

const Icon = ({ name, size = 20, color = '#4B5563', style }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);

const RagmanChatScreen = ({ route, navigation }) => {
  const { request, customerPhone, customerId } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [channelUrl, setChannelUrl] = useState(null);
  const flatListRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Initialize chat channel when component mounts
  useEffect(() => {
    initializeChat();
    return () => {
      // Cleanup polling on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      const token = await AsyncStorage.getItem('@jwt_token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please log in again.');
        navigation.goBack();
        return;
      }

      // Check if we need to pass customerId
      const actualCustomerId = customerId || request?.customer?.id || request?.userId;
      
      if (!actualCustomerId) {
        Alert.alert('Error', 'Customer ID not found. Cannot initialize chat.');
        navigation.goBack();
        return;
      }

      console.log('Initializing chat with customerId:', actualCustomerId);

      // Initialize or get existing channel
      const response = await fetch(CHAT_INITIATE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: parseInt(actualCustomerId),
        }),
      });

      const result = await response.json();
      console.log('Chat initiate response:', result);

      if (response.ok && result.channelUrl) {
        setChannelUrl(result.channelUrl);
        // Load messages after getting channel
        await loadMessages(result.channelUrl, token);
        // Start polling for new messages every 5 seconds
        startMessagePolling(result.channelUrl, token);
        // Mark as read
        await markAsRead(result.channelUrl, token);
      } else {
        throw new Error(result.error || 'Failed to initialize chat');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat. Please try again.');
      setIsLoading(false);
    }
  };

// Complete Fixed RagmanChatScreen.jsx
// Replace your entire loadMessages function with this:

const loadMessages = async (channelUrlParam, tokenParam) => {
  try {
    const token = tokenParam || await AsyncStorage.getItem('@jwt_token');
    const url = channelUrlParam || channelUrl;

    if (!url) {
      console.log('No channel URL available yet');
      return;
    }

    console.log('Loading messages from channel:', url);

    const response = await fetch(CHAT_GET_MESSAGES_API(url), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    console.log('Messages response:', result);

    if (response.ok && result.messages) {
      console.log('Number of messages received:', result.messages.length);
      
      // Ensure messages is an array
      const messagesArray = Array.isArray(result.messages) ? result.messages : [];
      
      // Get ragman's user ID for comparison
      const ragmanUserId = await AsyncStorage.getItem('@user_id');
      console.log('🔍 [RAGMAN CHAT] Current ragman user ID from AsyncStorage:', ragmanUserId);
      console.log('🔍 [RAGMAN CHAT] Type of ragmanUserId:', typeof ragmanUserId);

      // Log all AsyncStorage keys for debugging
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔍 [RAGMAN CHAT] All AsyncStorage keys:', allKeys);

      if (!ragmanUserId) {
        console.error('❌ [RAGMAN CHAT] CRITICAL: ragmanUserId is null or undefined!');
        console.error('❌ [RAGMAN CHAT] This will cause ALL messages to show as isRagman: false');
      }
      
      // Transform messages to match our UI format
      const transformedMessages = messagesArray.map((msg, index) => {
        console.log(`\n=== RAGMAN CHAT - Processing message ${index} ===`);
        console.log('Full message object:', JSON.stringify(msg, null, 2));
        console.log('Message sender object:', JSON.stringify(msg.sender, null, 2));

        // Get sender ID - try different possible property names
        // Check all possible variations (backend might transform the property names)
        const senderUserId = msg.sender?.user_id || msg.sender?.id || msg.sender?.userId || msg.senderId || msg.sender_id || msg.user_id;

        console.log('📤 Sender User ID extracted:', senderUserId, 'Type:', typeof senderUserId);
        console.log('👤 Ragman User ID from storage:', ragmanUserId, 'Type:', typeof ragmanUserId);

        // Convert both to strings for comparison to avoid type mismatch
        const senderIdStr = String(senderUserId);
        const ragmanIdStr = String(ragmanUserId);
        const isFromRagman = senderIdStr === ragmanIdStr;

        console.log(`🔍 COMPARISON: "${senderIdStr}" === "${ragmanIdStr}" = ${isFromRagman}`);
        console.log(`📍 Message ${index} - isRagman: ${isFromRagman} -> Will display on ${isFromRagman ? 'RIGHT (ragman own message)' : 'LEFT (customer message)'} side`);

        if (!isFromRagman && senderUserId === '36') {
          console.error('❌ MISMATCH DETECTED! Sender ID is 36 but not matching ragmanUserId!');
          console.error('❌ senderIdStr:', senderIdStr);
          console.error('❌ ragmanIdStr:', ragmanIdStr);
        }

        return {
          id: msg.messageId || msg.message_id || `temp-${Date.now()}-${index}`,
          text: msg.message || '',
          isRagman: isFromRagman,
          timestamp: new Date(msg.createdAt || msg.created_at || Date.now()),
          sender: msg.sender || {},
        };
      });

      console.log('Transformed messages:', transformedMessages);
      setMessages(transformedMessages); // Messages already come in correct order (oldest first)
      setIsLoading(false);
    } else {
      console.error('Failed to load messages:', result);
      setIsLoading(false);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    setIsLoading(false);
  }
};

  const startMessagePolling = (url, token) => {
    // Clear existing interval if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll for new messages every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      loadMessages(url, token);
    }, 5000);
  };

  const markAsRead = async (url, token) => {
    try {
      const authToken = token || await AsyncStorage.getItem('@jwt_token');
      await fetch(CHAT_MARK_AS_READ_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          channelUrl: url || channelUrl,
        }),
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !channelUrl) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('@jwt_token');

      const response = await fetch(CHAT_SEND_MESSAGE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelUrl: channelUrl,
          message: messageText,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Immediately add the message to UI for better UX
        const newMessage = {
          id: Date.now(),
          text: messageText,
          isRagman: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
        
        // Reload messages to get the actual message from server
        setTimeout(() => loadMessages(), 500);
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore the input text if sending failed
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleCall = () => {
    if (!customerPhone) {
      Alert.alert('Phone Not Available', 'Customer phone number is not available.');
      return;
    }

    Alert.alert(
      'Call Customer',
      `Call ${request?.customer?.name || 'Customer'} at ${customerPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneNumber = customerPhone.replace(/[^\d]/g, '');
            const phoneUrl = `tel:${phoneNumber}`;
            Linking.canOpenURL(phoneUrl)
              .then(supported => {
                if (supported) {
                  return Linking.openURL(phoneUrl);
                } else {
                  Alert.alert('Error', 'Unable to make phone calls on this device.');
                }
              })
              .catch(err => console.error('Error opening phone:', err));
          },
        },
      ]
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return messageDate.toLocaleDateString();
  };

  const renderMessage = ({ item, index }) => {
  const prevMessage = messages[index - 1];
  const showDateSeparator = !prevMessage || 
    formatDate(prevMessage.timestamp) !== formatDate(item.timestamp);

  return (
    <View>
      {showDateSeparator && (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          <View style={styles.dateLine} />
        </View>
      )}
      
      <View style={[
        styles.messageWrapper,
        item.isRagman ? styles.ragmanMessageWrapper : styles.customerMessageWrapper
      ]}>
        {/* Customer avatar - only show for customer messages (left side) */}
        {!item.isRagman && (
          <View style={styles.customerAvatar}>
            <Icon name="account" size={16} color="#1D4ED8" />
          </View>
        )}

        <View style={[
          styles.messageBubble,
          item.isRagman ? styles.ragmanBubble : styles.customerBubble
        ]}>
          {/* Sender name - ONLY show for received messages (customer messages), NOT for own messages */}
          {!item.isRagman && (
            <Text style={styles.senderName}>{request?.customer?.name || 'Customer'}</Text>
          )}

          <Text style={[
            styles.messageText,
            item.isRagman ? styles.ragmanMessageText : styles.customerMessageText
          ]}>
            {item.text}
          </Text>

          <Text style={[
            styles.messageTime,
            item.isRagman && styles.ragmanMessageTime
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
};

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <RNStatusBar barStyle="light-content" backgroundColor="#1D4ED8" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <RNStatusBar barStyle="light-content" backgroundColor="#1D4ED8" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {request?.customer?.name || 'Customer'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Request ID: {request?.id?.substring(0, 8) || 'N/A'}
          </Text>
        </View>
        
        <TouchableOpacity onPress={handleCall} style={styles.callButton}>
          <Icon name="phone" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : `msg-${index}`)}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chat-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              editable={!isSending}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
            >
              <Icon 
                name={isSending ? "clock-outline" : "send"} 
                size={20} 
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1D4ED8',
  },
  backButton: {
    padding: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#BFDBFE',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ragmanMessageWrapper: {
    justifyContent: 'flex-end',
  },
  customerMessageWrapper: {
    justifyContent: 'flex-start',
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  ragmanAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ragmanBubble: {
    backgroundColor: '#1D4ED8',
    borderBottomRightRadius: 4,
  },
  customerBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ragmanMessageText: {
    color: '#FFFFFF',
  },
  customerMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ragmanMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.6,
  },
});

export default RagmanChatScreen;