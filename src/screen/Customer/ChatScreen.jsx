// ChatScreen.jsx - Professional Chat Interface with Sendbird Integration
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar as RNStatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CHAT_INITIATE_API,
  CHAT_SEND_MESSAGE_API,
  CHAT_GET_MESSAGES_API,
  CHAT_MARK_AS_READ_API,
  CHAT_GET_CHANNELS_API,
} from '../../config';

const ChatScreen = ({ route, navigation }) => {
  const { ragman, requestId, customerId } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [channelUrl, setChannelUrl] = useState(null);
  const [ragmanInfo, setRagmanInfo] = useState(ragman || null); // Store ragman info
  const scrollViewRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Log ragman info on mount
  useEffect(() => {
    console.log('Ragman info from params:', ragman);
    console.log('Ragman name:', ragman?.name);
  }, []);

  // Initialize chat when component mounts
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
        scrollViewRef.current?.scrollToEnd({ animated: true });
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

      // Get customerId from params or AsyncStorage
      let actualCustomerId = customerId;
      if (!actualCustomerId) {
        actualCustomerId = await AsyncStorage.getItem('@user_id');
      }

      if (!actualCustomerId) {
        Alert.alert('Error', 'Customer ID not found. Please log in again.');
        navigation.goBack();
        return;
      }

      console.log('Customer initializing chat with customerId:', actualCustomerId);

      // Try to initiate chat (backend should find existing channel created by ragman)
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

      // If customer gets "Only ragmen can start chats" error, try to get existing channels
      if (!response.ok && result.error?.includes('Only ragmen can start chats')) {
        console.log('Customer cannot initiate - fetching existing channels...');
        await loadExistingChannels(token, actualCustomerId);
        return;
      }

      if (response.ok && result.channelUrl) {
        setChannelUrl(result.channelUrl);
        // Load messages after getting channel
        await loadMessages(result.channelUrl, token, actualCustomerId);
        // Start polling for new messages every 5 seconds
        startMessagePolling(result.channelUrl, token, actualCustomerId);
        // Mark as read
        await markAsRead(result.channelUrl, token);
      } else {
        throw new Error(result.error || 'Failed to initialize chat');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat. The ragman needs to send the first message.');
      setIsLoading(false);
    }
  };

  const loadMessages = async (channelUrlParam, tokenParam, customerIdParam) => {
    try {
      const token = tokenParam || await AsyncStorage.getItem('@jwt_token');
      const url = channelUrlParam || channelUrl;
      const actualCustomerId = customerIdParam || customerId || await AsyncStorage.getItem('@user_id');

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

        console.log('Current customer user ID:', actualCustomerId);

        // Transform messages to match our UI format
        const transformedMessages = messagesArray.map((msg, index) => {
          console.log(`\n=== Processing message ${index} ===`);
          console.log('Full message object:', JSON.stringify(msg, null, 2));

          // Get sender ID - try different possible property names
          // Check all possible variations (backend might transform the property names)
          const senderUserId = msg.sender?.user_id || msg.sender?.id || msg.sender?.userId || msg.senderId || msg.sender_id;

          console.log('Sender User ID extracted:', senderUserId, 'Type:', typeof senderUserId);
          console.log('Customer User ID from storage:', actualCustomerId, 'Type:', typeof actualCustomerId);

          // Convert both to strings for comparison to avoid type mismatch
          // isRagman = true means message is FROM ragman (so it should be on left for customer)
          // isRagman = false means message is FROM customer (so it should be on right for customer)
          const isFromCustomer = String(senderUserId) === String(actualCustomerId);

          console.log(`COMPARISON: \"${String(senderUserId)}\" === \"${String(actualCustomerId)}\" = ${isFromCustomer}`);
          console.log(`Message ${index} - isFromCustomer: ${isFromCustomer}, will show on ${isFromCustomer ? 'RIGHT' : 'LEFT'}`);

          return {
            id: msg.messageId || msg.message_id || `temp-${Date.now()}-${index}`,
            text: msg.message || '',
            isRagman: !isFromCustomer, // If NOT from customer, then it's from ragman
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

  // New function to load existing channels for customer
  const loadExistingChannels = async (token, actualCustomerId) => {
    try {
      const response = await fetch(CHAT_GET_CHANNELS_API, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log('Channels response:', result);

      if (response.ok && result.channels && result.channels.length > 0) {
        // Find the channel for this request/ragman
        // For now, use the first channel (most recent)
        const channel = result.channels[0];
        setChannelUrl(channel.channel_url || channel.channelUrl);
        await loadMessages(channel.channel_url || channel.channelUrl, token, actualCustomerId);
        startMessagePolling(channel.channel_url || channel.channelUrl, token, actualCustomerId);
        await markAsRead(channel.channel_url || channel.channelUrl, token);
      } else {
        Alert.alert(
          'Chat Not Available',
          'The ragman has not started the chat yet. Please wait for the ragman to send the first message.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      Alert.alert(
        'Chat Not Available',
        'Could not load chat. Please try again later.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setIsLoading(false);
    }
  };

  const startMessagePolling = (url, token, customerIdParam) => {
    // Clear existing interval if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll for new messages every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      loadMessages(url, token, customerIdParam);
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
          isRagman: false, // Customer's own message
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
    if (!ragman?.phone) {
      Alert.alert('Unavailable', 'Phone number is not available.');
      return;
    }

    Alert.alert(
      'Call Ragman',
      `Call ${ragman.name} at ${ragman.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${ragman.phone}`;
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
        {/* Ragman avatar - only show for ragman messages (left side) */}
        {item.isRagman && (
          <View style={styles.ragmanAvatar}>
            <Ionicons name="person" size={16} color="#166534" />
          </View>
        )}

        <View style={[
          styles.messageBubble,
          item.isRagman ? styles.ragmanBubble : styles.customerBubble
        ]}>
          {/* Sender name - ONLY show for received messages (ragman messages), NOT for own messages */}
          {item.isRagman && (
            <Text style={styles.senderName}>{ragmanInfo?.name || ragman?.name || 'Ragman'}</Text>
          )}

          <Text style={[
            styles.messageText,
            item.isRagman ? styles.ragmanMessageText : styles.customerMessageText
          ]}>
            {item.text}
          </Text>

          <Text style={[
            styles.messageTime,
            !item.isRagman && styles.customerMessageTime
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
};

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#98ce76', '#166534']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {ragmanInfo?.name || ragman?.name || 'Ragman'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Request #{requestId?.substring(0, 8) || 'N/A'}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleCall}
            style={styles.callButton}
          >
            <Ionicons name="call" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.messagesContentEmpty
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          ) : (
            messages.map((message, index) => (
              <View key={message.id || index}>
                {renderMessage({ item: message, index })}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={1000}
              editable={!isSending}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
            >
              <Ionicons 
                name={isSending ? "hourglass-outline" : "send"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  callButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messagesContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
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
    backgroundColor: '#e2e8f0',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  customerMessageWrapper: {
    justifyContent: 'flex-end',
  },
  ragmanMessageWrapper: {
    justifyContent: 'flex-start',
  },
  ragmanAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ragmanBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customerBubble: {
    backgroundColor: '#166534',
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 20,
  },
  ragmanMessageText: {
    color: '#1e293b',
  },
  customerMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  customerMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    color: '#1e293b',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
});

export default ChatScreen;