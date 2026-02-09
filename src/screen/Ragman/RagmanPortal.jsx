import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar as RNStatusBar,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Linking,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  RAGMAN_ME_API,
  GET_PENDING_REQUESTS_API,
  ACCEPT_REQUEST_API,
  GET_RAGMAN_ACCEPTED_REQUESTS_API,
  GET_LATEST_RATES_API,
  // Wallet APIs
  GET_WALLET_BALANCE_API,
  GET_WALLET_TRANSACTIONS_API,
  GET_WALLET_SUMMARY_API,
  GET_BANK_ACCOUNTS_API,
  ADD_BANK_ACCOUNT_API,
  SET_PRIMARY_BANK_ACCOUNT_API,
  DELETE_BANK_ACCOUNT_API,
  GET_WITHDRAWAL_SETTINGS_API,
  REQUEST_WITHDRAWAL_API,
  GET_MY_WITHDRAWALS_API,
  CANCEL_WITHDRAWAL_API,
} from '../../config';

const { width, height } = Dimensions.get('window');

// -----------------------------
// Utility: Resolve localhost IP for Android emulator
// -----------------------------
// Update the resolveUrlForDevice function in RagmanPortal.jsx
const resolveUrlForDevice = (url) => {
  if (Platform.OS === 'android' && url.includes('192.168')) {
    // Replace any local IP with Android emulator's host address
    return url.replace(/http:\/\/192\.168\.\d+\.\d+/, 'http://10.0.2.2');
  }
  return url;
};
// -----------------------------
// API Helper Functions
// -----------------------------
const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('@jwt_token');
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch(resolveUrlForDevice(url), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// API Functions
const fetchRagmanProfile = () => makeAuthenticatedRequest(RAGMAN_ME_API);
const fetchPendingRequests = () => makeAuthenticatedRequest(GET_PENDING_REQUESTS_API);
const fetchMyAcceptedRequests = () => makeAuthenticatedRequest(GET_RAGMAN_ACCEPTED_REQUESTS_API);
const fetchLatestRates = () => makeAuthenticatedRequest(GET_LATEST_RATES_API);

const acceptRequest = (requestId) =>
  makeAuthenticatedRequest(ACCEPT_REQUEST_API, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });

// Utility functions
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatLocation = (locationString) => {
  if (!locationString) return 'Location not specified';
  const [lat, lng] = locationString.split(',');
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
};

// -----------------------------
// Icon helper
// -----------------------------
const Icon = ({ name, size = 20, color = '#4B5563', style }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);

// -----------------------------
// Reusable UI components
// -----------------------------

const SectionCard = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const HeaderBar = ({ title, subtitle, rightIcon, onRightPress }) => (
  <View style={styles.headerBar}>
    <View style={{ flex: 1 }}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
    <TouchableOpacity onPress={onRightPress} style={styles.headerAvatar}>
      <Icon name={rightIcon || 'account'} size={20} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
);

const InlineInfo = ({ icon, text, color }) => (
  <View style={styles.inlineInfo}>
    <Icon name={icon} size={16} color={color || '#6B7280'} style={{ marginRight: 6 }} />
    <Text style={[styles.inlineInfoText, { color: color || '#4B5563' }]}>{text}</Text>
  </View>
);

const Badge = ({ text, type = 'default' }) => {
  const backgroundColor =
    type === 'free' ? '#F3F4F6' :
    type === 'warn' ? '#FEF3C7' :
    type === 'success' ? '#D1FAE5' :
    type === 'premium' ? '#EDE9FE' :
    type === 'pending' ? '#FEF3C7' :
    type === 'assigned' ? '#DBEAFE' :
    type === 'completed' ? '#D1FAE5' :
    '#E5E7EB';
    
  const color =
    type === 'free' ? '#374151' :
    type === 'warn' ? '#92400E' :
    type === 'success' ? '#065F46' :
    type === 'premium' ? '#5B21B6' :
    type === 'pending' ? '#92400E' :
    type === 'assigned' ? '#1D4ED8' :
    type === 'completed' ? '#065F46' :
    '#374151';
    
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
};

const StatRow = ({ label, value, color }) => (
  <View style={styles.statRow}>
    <Text style={styles.statRowLabel}>{label}</Text>
    <Text style={[styles.statRowValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const PrimaryButton = ({ title, onPress, disabled, icon, loading, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    disabled={disabled || loading}
    style={[styles.primaryBtn, disabled ? styles.btnDisabled : null, style]}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
    ) : icon ? (
      <Icon name={icon} size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
    ) : null}
    <Text style={styles.primaryBtnText}>{title}</Text>
  </TouchableOpacity>
);

const GhostButton = ({ title, onPress, icon, disabled, style }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[styles.ghostBtn, disabled ? styles.btnDisabledGhost : null, style]}
  >
    {icon ? <Icon name={icon} size={18} color="#1D4ED8" style={{ marginRight: 8 }} /> : null}
    <Text style={styles.ghostBtnText}>{title}</Text>
  </TouchableOpacity>
);

const Divider = ({ space = 12 }) => <View style={{ height: space }} />;

// -----------------------------
// Chat Modal Component
// -----------------------------
const ChatModal = ({ visible, onClose, request, customerPhone }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && request) {
      // Initialize with system message
      setMessages([
        {
          id: 1,
          text: `You have accepted the request from ${request.customer?.name || 'Customer'}. You can coordinate the pickup details.`,
          isSystem: true,
          timestamp: new Date(),
        }
      ]);
    }
  }, [visible, request]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      isRagman: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const callCustomer = () => {
    if (customerPhone) {
      const phoneNumber = customerPhone.replace(/[^\d]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Phone Not Available', 'Customer phone number is not available.');
    }
  };

  const renderMessage = ({ item }) => {
    // ... your existing renderMessage code
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.chatModal}>
        {/* Fixed Chat Header with proper back button */}
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={24} color="#1D4ED8" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.chatHeaderTitle}>
              {request?.customer?.name || 'Customer'}
            </Text>
            <Text style={styles.chatHeaderSubtitle}>
              Request ID: {request?.id?.substring(0, 8)}
            </Text>
          </View>
          <TouchableOpacity onPress={callCustomer} style={styles.callButton}>
            <Icon name="phone" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.messageInputContainer}
        >
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            disabled={!newMessage.trim()}
          >
            <Icon name="send" size={20} color={!newMessage.trim() ? '#9CA3AF' : '#1D4ED8'} />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// -----------------------------
// Request Detail Modal Component
// -----------------------------
const RequestDetailModal = ({ visible, onClose, request, onAccept, isAccepting }) => {
  if (!request) return null;

  const totalValue = request.items?.reduce((sum, item) => {
    return sum + (item.customerRate * parseFloat(item.weight?.replace(' kg', '') || '0') * item.quantity);
  }, 0) || 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.detailModal}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>Request Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.detailContent}>
          {/* Customer Info */}
          <SectionCard>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <Divider space={8} />
            <InlineInfo icon="account" text={request.customer?.name || 'Customer'} />
            <InlineInfo icon="map-marker" text={formatLocation(request.location)} />
            <InlineInfo icon="clock-time-four" text={formatTimeAgo(request.createdAt)} />
          </SectionCard>

          <Divider />

          {/* Request Summary */}
          <SectionCard>
            <Text style={styles.sectionTitle}>Request Summary</Text>
            <Divider space={8} />
            <StatRow label="Total Weight" value={request.totalWeight || 'N/A'} />
            <StatRow label="Total Points" value={`${request.totalPoints || 0} pts`} />
            <StatRow label="Estimated Value" value={`PKR ${totalValue.toFixed(2)}`} />
            <StatRow label="Items Count" value={`${request.items?.length || 0} categories`} />
          </SectionCard>

          <Divider />

          {/* Items List */}
          <SectionCard>
            <Text style={styles.sectionTitle}>Items Details</Text>
            <Divider space={8} />
            {request.items?.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.category}</Text>
                  <Text style={styles.itemDetails}>
                    {item.weight} × {item.quantity} = {item.points} pts
                  </Text>
                </View>
                <Text style={styles.itemValue}>
                  PKR {(item.customerRate * parseFloat(item.weight?.replace(' kg', '') || '0') * item.quantity).toFixed(2)}
                </Text>
              </View>
            )) || (
              <Text style={styles.noItemsText}>No items details available</Text>
            )}
          </SectionCard>

          <Divider />

          {/* Action Notes */}
          <SectionCard style={styles.noteCard}>
            <Icon name="information-outline" size={20} color="#1D4ED8" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>Free Account Notice</Text>
              <Text style={styles.noteText}>
                After accepting, the customer will be notified and will contact you directly to arrange the pickup.
              </Text>
            </View>
          </SectionCard>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.detailActions}>
          <GhostButton
            title="Cancel"
            onPress={onClose}
            style={{ flex: 1, marginRight: 8 }}
          />
          <PrimaryButton
            title={isAccepting ? "Accepting..." : "Accept Request"}
            onPress={() => onAccept(request.id)}
            loading={isAccepting}
            icon={isAccepting ? null : "check"}
            style={{ flex: 2 }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// -----------------------------
// Requests Screen (Updated)
// -----------------------------
const RequestsScreen = ({ ragmanData }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [dailyStats, setDailyStats] = useState({ used: 0, total: 5 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadRequests = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      // Fetch pending requests with better error handling
      const data = await fetchPendingRequests();
      
      if (data.success) {
        // Add timeAgo to each request and sort by creation time (newest first)
        const requestsWithTime = (data.requests || [])
          .map(req => ({
            ...req,
            timeAgo: formatTimeAgo(req.createdAt),
            // Calculate total value for display
            totalValue: req.items?.reduce((sum, item) => {
              const weight = parseFloat(item.weight?.replace(' kg', '') || '0');
              return sum + (item.customerRate * weight * item.quantity);
            }, 0) || 0
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first
        
        setRequests(requestsWithTime);
        
        // Calculate daily usage for free accounts
        try {
          const acceptedData = await fetchMyAcceptedRequests();
          if (acceptedData.success) {
            const today = new Date().toDateString();
            const todayAccepted = (acceptedData.requests || []).filter(req => 
              new Date(req.createdAt).toDateString() === today
            ).length;
            setDailyStats({ used: todayAccepted, total: 5 });
          }
        } catch (acceptedError) {
          console.log('Could not fetch accepted requests:', acceptedError);
          // Don't fail the whole operation if accepted requests fail
        }
      }
    } catch (error) {
      console.error('Load requests error:', error);
      
      // Better error handling
      if (error.message.includes('verification')) {
        Alert.alert('Verification Required', 'Please complete verification to view requests.');
      } else if (error.message.includes('Daily limit')) {
        Alert.alert('Daily Limit', 'You have reached your daily limit of 5 requests for free account.');
      } else if (error.message.includes('Network')) {
        Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      } else {
        // Don't show error alert for every failed request to avoid spam
        console.log('Failed to load requests:', error.message);
      }
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fixed useEffect with proper closing and return statement
  useEffect(() => {
    loadRequests();
    
    // Shorter interval for better real-time updates (15 seconds instead of 30)
    const interval = setInterval(() => {
      loadRequests(false);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [loadRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests(false);
  }, [loadRequests]);

  // FIXED: Removed duplicate try-catch block
  const handleAcceptRequest = async (requestId) => {
    if (dailyStats.used >= dailyStats.total) {
      Alert.alert('Daily Limit Reached', 'You have reached your daily limit of 5 requests. Upgrade to Premium for unlimited requests.');
      return;
    }

    setAcceptingId(requestId);
    try {
      const result = await acceptRequest(requestId);
      if (result.success) {
        // Remove from pending list
        setRequests(prev => prev.filter(r => r.id !== requestId));
        setDailyStats(prev => ({ ...prev, used: prev.used + 1 }));
        setShowDetailModal(false);
        Alert.alert('Success', 'Request accepted! Customer will be notified and will contact you directly.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    } finally {
      setAcceptingId(null);
    }
  };

  const showRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const remaining = Math.max(dailyStats.total - dailyStats.used, 0);

  const RequestItem = ({ item }) => (
    <TouchableOpacity onPress={() => showRequestDetails(item)}>
      <SectionCard style={{ padding: 14 }}>
        {/* Header Row */}
        <View style={styles.reqHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reqName}>{item.customer?.name || 'Customer'}</Text>
            <InlineInfo icon="map-marker" text={formatLocation(item.location)} />
            <InlineInfo icon="clock-time-four" text={item.timeAgo} />
          </View>
          <Badge text="PENDING" type="pending" />
        </View>

        <Divider space={10} />

        {/* Details */}
        <View style={styles.reqDetailRow}>
          <InlineInfo 
            icon="package-variant" 
            text={`${item.items?.length || 0} categories`} 
            color="#047857" 
          />
        </View>
        <View style={styles.reqDetailRow}>
          <InlineInfo icon="weight-kilogram" text={`${item.totalWeight || 'N/A'}`} color="#9A3412" />
        </View>
        <View style={styles.reqDetailRow}>
          <InlineInfo icon="currency-usd" text={`PKR ${item.totalValue || 0}`} color="#065F46" />
        </View>
        <View style={styles.reqDetailRow}>
          <InlineInfo icon="star-outline" text={`${item.totalPoints || 0} points`} color="#7C3AED" />
        </View>

        <Divider space={10} />

        {/* Actions */}
        <View style={styles.reqActionRow}>
          <PrimaryButton
            title={acceptingId === item.id ? "Accepting..." : "Accept Request"}
            onPress={() => handleAcceptRequest(item.id)}
            disabled={dailyStats.used >= dailyStats.total || acceptingId === item.id}
            loading={acceptingId === item.id}
            icon={acceptingId === item.id ? null : "check"}
            style={{ flex: 1, marginRight: 8 }}
          />

          <TouchableOpacity style={styles.viewDetailsBtn}>
            <Icon name="eye-outline" size={18} color="#1D4ED8" />
          </TouchableOpacity>
        </View>

        {/* Free notice */}
        <View style={styles.freeNotice}>
          <Icon name="information-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
          <Text style={styles.freeNoticeText}>
            Free account: Customer will contact you directly after acceptance
          </Text>
        </View>
      </SectionCard>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.screenPad} 
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Notice */}
        <SectionCard style={styles.freeCard}>
          <View style={styles.freeCardRow}>
            <Icon name="alert-circle" size={20} color="#92400E" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.freeCardTitle}>Free Account Limitations</Text>
              <Text style={styles.freeCardText}>
                Daily requests: {dailyStats.used}/{dailyStats.total} • Requests shown with 5-min delay • Lower priority
              </Text>
            </View>
            <Icon name="crown-outline" size={18} color="#92400E" />
          </View>
        </SectionCard>

        {/* Stats */}
        <SectionCard>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bigBlue}>{requests.length}</Text>
              <Text style={styles.smallMuted}>Available Requests</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.mediumBold, remaining === 0 ? { color: '#DC2626' } : null]}>
                {remaining}
              </Text>
              <Text style={styles.smallMuted}>Remaining today</Text>
            </View>
          </View>
        </SectionCard>

        {/* List */}
        {loading ? (
          <SectionCard style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator size="small" color="#1D4ED8" />
            <Text style={[styles.smallMuted, { marginTop: 8 }]}>Loading requests...</Text>
          </SectionCard>
        ) : requests.length === 0 ? (
          <SectionCard style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Icon name="package-variant" size={44} color="#D1D5DB" />
            <Text style={[styles.mutedText, { marginTop: 8 }]}>No requests available</Text>
            <Text style={[styles.smallMuted, { marginTop: 2 }]}>
              {dailyStats.used >= dailyStats.total 
                ? 'Daily limit reached. Upgrade to Premium for unlimited requests.'
                : 'New requests appear with delay for free accounts'
              }
            </Text>
          </SectionCard>
        ) : (
          <View style={{ gap: 12 }}>
            {requests.map((r) => (
              <RequestItem key={r.id} item={r} />
            ))}
          </View>
        )}

        {/* Upgrade Prompt */}
        <View style={styles.upgradeBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="crown-outline" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
              <Text style={styles.upgradeSubtitle}>
                Unlimited requests • Instant visibility • Rider dispatch • Direct chat
              </Text>
            </View>
            <TouchableOpacity style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Request Detail Modal */}
      <RequestDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        request={selectedRequest}
        onAccept={handleAcceptRequest}
        isAccepting={acceptingId === selectedRequest?.id}
      />
    </View>
  );
};

// Rider assignment feature removed - This is a FREE account feature limitation
// Premium accounts have access to rider assignment functionality

// -----------------------------
// Accepted Requests Screen (Updated)
// -----------------------------
const AcceptedScreen = ({ navigation }) => {
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAcceptedRequests = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await fetchMyAcceptedRequests();
      if (data.success) {
        const requestsWithTime = (data.requests || []).map(req => ({
          ...req,
          timeAgo: formatTimeAgo(req.createdAt),
          acceptedTimeAgo: req.acceptedAt ? formatTimeAgo(req.acceptedAt) : 'Recently'
        }));
        setAcceptedRequests(requestsWithTime);
      }
    } catch (error) {
      console.error('Load accepted requests error:', error);
      Alert.alert('Error', 'Failed to load accepted requests: ' + error.message);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAcceptedRequests(false);
  }, [loadAcceptedRequests]);

  useEffect(() => {
    loadAcceptedRequests();
    // Refresh every 60 seconds to check for updates
    const interval = setInterval(() => loadAcceptedRequests(false), 60000);
    return () => clearInterval(interval);
  }, [loadAcceptedRequests]);

  const openChat = (request) => {
  navigation.navigate('RagmanChatScreen', {
    request: request,
    customerPhone: request.customer?.phone,
    customerId: request.customer?.id || request.userId  // Make sure this is the customer's user ID
  });
};

  const callCustomer = (phone) => {
    if (phone) {
      const phoneNumber = phone.replace(/[^\d]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Phone Not Available', 'Customer phone number is not available.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'ASSIGNED':
        return <Badge text="ASSIGNED" type="assigned" />;
      case 'COMPLETED':
        return <Badge text="COMPLETED" type="completed" />;
      default:
        return <Badge text="ACCEPTED" type="success" />;
    }
  };

  const AcceptedItem = ({ item }) => (
    <SectionCard style={{ padding: 14 }}>
      <View style={styles.reqHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reqName}>{item.customer?.name || 'Customer'}</Text>
          <InlineInfo icon="map-marker" text={formatLocation(item.location)} />
          <InlineInfo icon="check-circle" text={`Accepted ${item.acceptedTimeAgo}`} color="#059669" />
        </View>
        {getStatusBadge(item.status)}
      </View>

      <Divider space={10} />

      <View style={styles.reqDetailRow}>
        <InlineInfo icon="weight-kilogram" text={`${item.totalWeight || 'N/A'}`} color="#9A3412" />
      </View>
      <View style={styles.reqDetailRow}>
        <InlineInfo icon="currency-usd" text={`PKR ${item.totalValue || 0}`} color="#065F46" />
      </View>
      <View style={styles.reqDetailRow}>
        <InlineInfo icon="star-outline" text={`${item.totalPoints || 0} points`} color="#7C3AED" />
      </View>

      <Divider space={8} />

      {/* Action Buttons - FREE ACCOUNT */}
      <View style={styles.acceptedActionRow}>
        <GhostButton
          title="Call Customer"
          onPress={() => callCustomer(item.customer?.phone)}
          icon="phone"
          style={{ flex: 1, marginRight: 8 }}
        />
        <GhostButton
          title="Chat"
          onPress={() => openChat(item)}
          icon="message-text-outline"
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.freeNotice}>
        <Icon name="information-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
        <Text style={styles.freeNoticeText}>
          Free account: Contact customer directly to arrange pickup. Upgrade to Premium for rider dispatch.
        </Text>
      </View>
    </SectionCard>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.screenPad} 
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <SectionCard style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator size="small" color="#1D4ED8" />
            <Text style={[styles.smallMuted, { marginTop: 8 }]}>Loading accepted requests...</Text>
          </SectionCard>
        ) : acceptedRequests.length === 0 ? (
          <SectionCard style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Icon name="check-circle-outline" size={44} color="#D1D5DB" />
            <Text style={[styles.mutedText, { marginTop: 8 }]}>No accepted requests yet</Text>
            <Text style={[styles.smallMuted, { marginTop: 2 }]}>
              Accepted requests will appear here
            </Text>
          </SectionCard>
        ) : (
          <View style={{ gap: 12 }}>
            {acceptedRequests.map((r) => (
              <AcceptedItem key={r.id} item={r} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// -----------------------------
// Rates Screen
// -----------------------------
const RatesScreen = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRates = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await fetchLatestRates();

      if (response.success && response.data) {
        // Transform the data object into an array
        const ratesArray = Object.keys(response.data).map((key) => ({
          id: key,
          category: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
          rate: response.data[key].rate,
          trend: response.data[key].trend,
          lastUpdated: response.data[key].lastUpdated,
        }));
        setRates(ratesArray);
      }
    } catch (error) {
      console.error('Load rates error:', error);
      Alert.alert('Error', 'Failed to load rates: ' + error.message);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRates(false);
  }, [loadRates]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const RateItem = ({ item }) => {
    const getTrendColor = (trend) => {
      if (!trend) return '#6B7280';
      const value = parseFloat(trend);
      return value > 0 ? '#059669' : value < 0 ? '#DC2626' : '#6B7280';
    };

    const getTrendIcon = (trend) => {
      if (!trend) return null;
      const value = parseFloat(trend);
      return value > 0 ? 'trending-up' : value < 0 ? 'trending-down' : 'minus';
    };

    const formatLastUpdated = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <SectionCard style={{ padding: 14 }}>
        <View style={styles.rateItemRow}>
          <View style={styles.rateIconContainer}>
            <Icon
              name={
                item.category === 'Plastic' ? 'bottle-soda' :
                item.category === 'Glass' ? 'glass-fragile' :
                item.category === 'Metal' ? 'dump-truck' :
                item.category === 'Paper' ? 'newspaper-variant' :
                item.category === 'Wood' ? 'tree' :
                item.category === 'Generic' ? 'recycle' :
                'recycle'
              }
              size={28}
              color="#1D4ED8"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rateCategoryName}>{item.category}</Text>
            <Text style={styles.rateSubtext}>Government approved rate</Text>
            {item.trend && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Icon
                  name={getTrendIcon(item.trend)}
                  size={14}
                  color={getTrendColor(item.trend)}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.trendText, { color: getTrendColor(item.trend) }]}>
                  {item.trend}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.rateValueContainer}>
            <Text style={styles.rateValue}>PKR {item.rate}</Text>
            <Text style={styles.rateUnit}>per kg</Text>
          </View>
        </View>
        {item.lastUpdated && (
          <View style={styles.lastUpdatedContainer}>
            <Icon name="clock-outline" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
            <Text style={styles.lastUpdatedText}>
              Updated: {formatLastUpdated(item.lastUpdated)}
            </Text>
          </View>
        )}
      </SectionCard>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.screenPad}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Info Banner */}
        <SectionCard style={styles.ratesInfoCard}>
          <View style={styles.freeCardRow}>
            <Icon name="information" size={20} color="#1D4ED8" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ratesInfoTitle}>Government Rates</Text>
              <Text style={styles.ratesInfoText}>
                These are the official rates set by the government for recyclable materials
              </Text>
            </View>
          </View>
        </SectionCard>

        <Divider space={12} />

        {loading ? (
          <SectionCard style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator size="small" color="#1D4ED8" />
            <Text style={[styles.smallMuted, { marginTop: 8 }]}>Loading rates...</Text>
          </SectionCard>
        ) : rates.length === 0 ? (
          <SectionCard style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Icon name="currency-usd-off" size={44} color="#D1D5DB" />
            <Text style={[styles.mutedText, { marginTop: 8 }]}>No rates available</Text>
            <Text style={[styles.smallMuted, { marginTop: 2 }]}>
              Rates will appear here once set by the government
            </Text>
          </SectionCard>
        ) : (
          <View style={{ gap: 12 }}>
            {rates.map((rate) => (
              <RateItem key={rate.id} item={rate} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// -----------------------------
// Profile Screen (Updated)
// -----------------------------
const ProfileScreen = ({ ragmanData, onRefresh, navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalAccepted: 0,
    completed: 0,
    activeRequests: 0,
  });

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRagmanProfile();
      if (data.user?.ragman) {
        setProfile({
          businessName: data.user.name || 'Business Name',
          ownerName: data.user.name || 'Owner Name',
          email: data.user.email || '',
          phone: data.user.ragman.verificationDetails?.phoneNumber || 'Not provided',
          subscriptionPlan: data.user.ragman.subscriptionPlan || 'Free Plan',
          verificationStatus: data.user.ragman.verificationStatus,
          emailVerifyStatus: data.user.ragman.emailVerifyStatus,
          averageRating: data.user.ragman.averageRating || 0,
          completedCollections: data.user.ragman.completedCollections || 0,
        });

        // Fetch stats
        await fetchStats();
      }
    } catch (error) {
      console.error('Load profile error:', error);
      Alert.alert('Error', 'Failed to load profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = async () => {
    try {
      const acceptedData = await fetchMyAcceptedRequests();
      if (acceptedData.success) {
        const requests = acceptedData.requests || [];
        const completed = requests.filter(r => r.status === 'COMPLETED').length;
        const active = requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;

        setStats({
          totalAccepted: requests.length,
          completed: completed,
          activeRequests: active,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefreshProfile = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    onRefresh();
    setRefreshing(false);
  }, [loadProfile, onRefresh]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = (nav) => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@jwt_token');
              nav.reset({ index: 0, routes: [{ name: 'RagmanLogin' }] });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.screenPad} contentContainerStyle={{ paddingBottom: 90 }}>
        <SectionCard style={{ alignItems: 'center', paddingVertical: 28 }}>
          <ActivityIndicator size="small" color="#1D4ED8" />
          <Text style={[styles.smallMuted, { marginTop: 8 }]}>Loading profile...</Text>
        </SectionCard>
      </ScrollView>
    );
  }

  if (!profile) {
    return (
      <ScrollView style={styles.screenPad} contentContainerStyle={{ paddingBottom: 90 }}>
        <SectionCard style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Icon name="alert-circle" size={44} color="#EF4444" />
          <Text style={[styles.mutedText, { marginTop: 8 }]}>Failed to load profile</Text>
          <GhostButton title="Retry" onPress={loadProfile} icon="refresh" />
        </SectionCard>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Animated Header Background */}
      <Animated.View style={[styles.profileAnimatedHeader, { opacity: headerOpacity }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1D4ED8' }]} />
      </Animated.View>

      <Animated.ScrollView
        style={styles.profileScrollView}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefreshProfile} tintColor="#1D4ED8" />
        }
      >
        {/* Hero Section */}
        <View style={styles.profileHeroSection}>
          <View style={styles.profileAvatarLarge}>
            <Icon name="account" size={48} color="#1D4ED8" />
          </View>
          <Text style={styles.profileHeroName}>{profile.businessName}</Text>
          <Text style={styles.profileHeroSubtitle}>{profile.ownerName}</Text>
          <View style={styles.profileHeroRating}>
            <Icon name="star" size={20} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.profileHeroRatingText}>
              {profile.averageRating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.profileHeroRatingCount}>
              ({profile.completedCollections} completed)
            </Text>
          </View>
          <Badge text="FREE ACCOUNT" type="free" style={{ marginTop: 8 }} />
        </View>

        {/* Stats Dashboard */}
        <View style={styles.profileStatsContainer}>
          <View style={styles.profileStatCardRow}>
            <View style={[styles.profileStatCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <View style={[styles.profileStatIconCircle, { backgroundColor: '#1D4ED8' }]}>
                <Icon name="briefcase-check" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.profileStatValue, { color: '#1D4ED8' }]}>{stats.totalAccepted}</Text>
              <Text style={styles.profileStatLabel}>Total Accepted</Text>
            </View>

            <View style={[styles.profileStatCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <View style={[styles.profileStatIconCircle, { backgroundColor: '#10B981' }]}>
                <Icon name="check-circle" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.profileStatValue, { color: '#10B981' }]}>{stats.completed}</Text>
              <Text style={styles.profileStatLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.profileStatCardRow}>
            <View style={[styles.profileStatCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <View style={[styles.profileStatIconCircle, { backgroundColor: '#F59E0B' }]}>
                <Icon name="clock-fast" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.profileStatValue, { color: '#F59E0B' }]}>{stats.activeRequests}</Text>
              <Text style={styles.profileStatLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* Free Account Limitations Notice */}
        <View style={styles.profileContentPad}>
          <SectionCard style={styles.freeCard}>
            <View style={styles.freeCardRow}>
              <Icon name="information" size={20} color="#92400E" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.freeCardTitle}>Free Account Limitations</Text>
                <Text style={styles.freeCardText}>
                  • 5 requests per day • 5-min request delay • Lower priority • No rider dispatch
                </Text>
              </View>
              <Icon name="crown-outline" size={20} color="#92400E" />
            </View>
          </SectionCard>

          <Divider space={12} />

          {/* Verification Status */}
          <SectionCard>
            <View style={styles.profileSectionHeader}>
              <Icon name="shield-check-outline" size={20} color="#1D4ED8" style={{ marginRight: 8 }} />
              <Text style={styles.profileSectionTitle}>Verification Status</Text>
            </View>
            <Divider space={10} />
            <View style={{ gap: 10 }}>
              <View style={styles.profileVerificationRow}>
                <View style={styles.profileVerificationLeft}>
                  <Icon
                    name={profile.emailVerifyStatus ? "check-circle" : "clock-outline"}
                    size={18}
                    color={profile.emailVerifyStatus ? "#10B981" : "#F59E0B"}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.profileVerificationText}>Email Verification</Text>
                </View>
                <Badge
                  text={profile.emailVerifyStatus ? 'Verified' : 'Pending'}
                  type={profile.emailVerifyStatus ? 'success' : 'warn'}
                />
              </View>

              <View style={styles.profileVerificationRow}>
                <View style={styles.profileVerificationLeft}>
                  <Icon
                    name={profile.verificationStatus ? "check-circle" : "clock-outline"}
                    size={18}
                    color={profile.verificationStatus ? "#10B981" : "#F59E0B"}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.profileVerificationText}>Document Verification</Text>
                </View>
                <Badge
                  text={profile.verificationStatus ? 'Verified' : 'Pending Review'}
                  type={profile.verificationStatus ? 'success' : 'warn'}
                />
              </View>
            </View>
          </SectionCard>

          <Divider space={12} />

          {/* Contact Information */}
          <SectionCard>
            <View style={styles.profileSectionHeader}>
              <Icon name="card-account-details-outline" size={20} color="#1D4ED8" style={{ marginRight: 8 }} />
              <Text style={styles.profileSectionTitle}>Contact Information</Text>
            </View>
            <Divider space={10} />
            <View style={{ gap: 10 }}>
              <View style={styles.profileInfoRow}>
                <Icon name="email-outline" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                <Text style={styles.profileInfoText}>{profile.email}</Text>
              </View>
              <View style={styles.profileInfoRow}>
                <Icon name="phone-outline" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                <Text style={styles.profileInfoText}>{profile.phone}</Text>
              </View>
            </View>
          </SectionCard>

          <Divider space={12} />

          {/* Account Features */}
          <SectionCard>
            <View style={styles.profileSectionHeader}>
              <Icon name="feature-search-outline" size={20} color="#1D4ED8" style={{ marginRight: 8 }} />
              <Text style={styles.profileSectionTitle}>Account Features</Text>
            </View>
            <Divider space={10} />
            <View style={{ gap: 8 }}>
              <StatRow label="Subscription Plan" value={profile.subscriptionPlan} />
              <StatRow label="Daily Request Limit" value="5 requests" color="#DC2626" />
              <StatRow label="Priority Level" value="Lower Priority" color="#EA580C" />
              <StatRow label="Request Delay" value="5 minutes" color="#DC2626" />
              <StatRow label="Customer Chat" value="Available" color="#10B981" />
              <StatRow label="Rider Dispatch" value="Not Available" color="#DC2626" />
            </View>
          </SectionCard>

          <Divider space={12} />

          {/* Quick Actions */}
          <SectionCard>
            <View style={styles.profileSectionHeader}>
              <Icon name="lightning-bolt-outline" size={20} color="#1D4ED8" style={{ marginRight: 8 }} />
              <Text style={styles.profileSectionTitle}>Quick Actions</Text>
            </View>
            <Divider space={10} />
            <View style={styles.profileQuickActionsGrid}>
              <TouchableOpacity
                style={styles.profileQuickAction}
                onPress={() => {
                  Alert.alert('Upgrade Available', 'Contact support to upgrade to Premium plan for unlimited requests and priority access.');
                }}
              >
                <View style={[styles.profileQuickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="crown-outline" size={22} color="#F59E0B" />
                </View>
                <Text style={styles.profileQuickActionText}>Upgrade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileQuickAction}
                onPress={onRefreshProfile}
              >
                <View style={[styles.profileQuickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="refresh" size={22} color="#1D4ED8" />
                </View>
                <Text style={styles.profileQuickActionText}>Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileQuickAction}
                onPress={() => {
                  Alert.alert('Help & Support', 'For assistance, contact support@scrapify.com');
                }}
              >
                <View style={[styles.profileQuickActionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Icon name="help-circle-outline" size={22} color="#10B981" />
                </View>
                <Text style={styles.profileQuickActionText}>Help</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileQuickAction}
                onPress={() => handleLogout(navigation)}
              >
                <View style={[styles.profileQuickActionIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Icon name="logout" size={22} color="#EF4444" />
                </View>
                <Text style={styles.profileQuickActionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>

          <Divider space={12} />

          {/* Premium Upgrade Banner */}
          <TouchableOpacity
            style={styles.profileUpgradeBanner}
            onPress={() => {
              Alert.alert(
                'Upgrade to Premium',
                'Premium benefits:\n\n• Unlimited daily requests\n• Instant request visibility\n• Highest priority\n• Rider dispatch system\n• Advanced analytics\n\nContact support to upgrade!',
                [{ text: 'OK' }]
              );
            }}
            activeOpacity={0.85}
          >
            <View style={styles.profileUpgradeBannerContent}>
              <View style={styles.profileUpgradeBannerLeft}>
                <Icon name="crown" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.profileUpgradeBannerRight}>
                <Text style={styles.profileUpgradeBannerTitle}>Upgrade to Premium</Text>
                <Text style={styles.profileUpgradeBannerSubtitle}>
                  Unlimited requests • Instant visibility • Rider dispatch • Priority access
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

// -----------------------------
// Wallet Screen (Free Account)
// -----------------------------
const WalletScreen = () => {
  const [walletTab, setWalletTab] = useState('balance');
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletSummary, setWalletSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalSettings, setWithdrawalSettings] = useState(null);
  const [loadingState, setLoadingState] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [bankForm, setBankForm] = useState({
    accountTitle: '',
    accountNumber: '',
    bankName: '',
    branchCode: ''
  });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);

  useEffect(() => {
    loadWalletData();
  }, [walletTab]);

  const loadWalletData = async () => {
    try {
      setLoadingState(true);

      if (walletTab === 'balance') {
        const [balanceData, summaryData] = await Promise.all([
          makeAuthenticatedRequest(GET_WALLET_BALANCE_API),
          makeAuthenticatedRequest(GET_WALLET_SUMMARY_API)
        ]);

        if (balanceData.success) setWalletBalance(balanceData.balance);
        if (summaryData.success) setWalletSummary(summaryData.summary);
      } else if (walletTab === 'transactions') {
        const data = await makeAuthenticatedRequest(GET_WALLET_TRANSACTIONS_API);
        if (data.success) setTransactions(data.transactions || []);
      } else if (walletTab === 'banks') {
        const data = await makeAuthenticatedRequest(GET_BANK_ACCOUNTS_API);
        if (data.success) setBankAccounts(data.accounts || []);
      } else if (walletTab === 'withdrawals') {
        const [withdrawalsData, settingsData] = await Promise.all([
          makeAuthenticatedRequest(GET_MY_WITHDRAWALS_API),
          makeAuthenticatedRequest(GET_WITHDRAWAL_SETTINGS_API)
        ]);

        if (withdrawalsData.success) setWithdrawals(withdrawalsData.withdrawals || []);
        if (settingsData.success) setWithdrawalSettings(settingsData.settings);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoadingState(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleAddBankAccount = async () => {
    try {
      if (!bankForm.accountTitle || !bankForm.accountNumber || !bankForm.bankName) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const response = await makeAuthenticatedRequest(ADD_BANK_ACCOUNT_API, {
        method: 'POST',
        body: JSON.stringify(bankForm)
      });

      if (response.success) {
        Alert.alert('Success', 'Bank account added successfully');
        setShowAddBankModal(false);
        setBankForm({ accountTitle: '', accountNumber: '', bankName: '', branchCode: '' });
        loadWalletData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add bank account');
    }
  };

  const handleDeleteBankAccount = async (accountId) => {
    Alert.alert(
      'Delete Bank Account',
      'Are you sure you want to delete this bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await makeAuthenticatedRequest(DELETE_BANK_ACCOUNT_API(accountId), {
                method: 'DELETE'
              });
              if (response.success) {
                Alert.alert('Success', 'Bank account deleted');
                loadWalletData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bank account');
            }
          }
        }
      ]
    );
  };

  const handleSetPrimaryAccount = async (accountId) => {
    try {
      const response = await makeAuthenticatedRequest(SET_PRIMARY_BANK_ACCOUNT_API, {
        method: 'POST',
        body: JSON.stringify({ accountId })
      });
      if (response.success) {
        Alert.alert('Success', 'Primary account updated');
        loadWalletData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update primary account');
    }
  };

  const handleRequestWithdrawal = async () => {
    try {
      if (!selectedBankAccount || !withdrawAmount) {
        Alert.alert('Error', 'Please select a bank account and enter amount');
        return;
      }

      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const response = await makeAuthenticatedRequest(REQUEST_WITHDRAWAL_API, {
        method: 'POST',
        body: JSON.stringify({
          bankAccountId: selectedBankAccount,
          amount: Math.round(amount) // Amount in PKR
        })
      });

      if (response.success) {
        Alert.alert('Success', `Withdrawal request submitted!\n\nAmount: ${response.withdrawal.amount}\nFee: ${response.withdrawal.fee}\nNet Amount: ${response.withdrawal.netAmount}`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setSelectedBankAccount(null);
        loadWalletData();
      }
    } catch (error) {
      console.error('Withdrawal request error:', error);
      const errorMessage = error.message || 'Failed to request withdrawal';
      Alert.alert('Withdrawal Error', errorMessage);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId) => {
    Alert.alert(
      'Cancel Withdrawal',
      'Are you sure you want to cancel this withdrawal request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const response = await makeAuthenticatedRequest(CANCEL_WITHDRAWAL_API, {
                method: 'POST',
                body: JSON.stringify({ withdrawalId })
              });
              if (response.success) {
                Alert.alert('Success', 'Withdrawal cancelled and amount refunded');
                loadWalletData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel withdrawal');
            }
          }
        }
      ]
    );
  };

 const formatAmount = (amount) => {
  if (!amount && amount !== 0) return 'PKR 0.00';
  if (typeof amount === 'string') return amount;
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  return `PKR ${(numAmount / 100).toFixed(2)}`;
};

  const getTransactionIcon = (type) => {
    const icons = {
      EARNED_TRASH: 'cash-plus',
      ADMIN_PAYMENT: 'cash',
      BONUS: 'gift',
      WITHDRAWAL_REQUEST: 'bank-transfer-out',
      WITHDRAWAL_FEE: 'cash-minus',
      WITHDRAWAL_REFUND: 'cash-refund',
      ADMIN_ADJUSTMENT: 'tune'
    };
    return icons[type] || 'cash';
  };

  const getStatusBadgeType = (status) => {
    const statusColors = {
      PENDING: { bg: '#FEF3C7', text: '#F59E0B' },
      APPROVED: { bg: '#D1FAE5', text: '#10B981' },
      PROCESSING: { bg: '#E0E7FF', text: '#6366F1' },
      COMPLETED: { bg: '#D1FAE5', text: '#059669' },
      REJECTED: { bg: '#FEE2E2', text: '#EF4444' },
      CANCELLED: { bg: '#F3F4F6', text: '#6B7280' }
    };
    return statusColors[status] || statusColors.PENDING;
  };

  const walletTabs = [
    { id: 'balance', label: 'Balance', icon: 'wallet' },
    { id: 'transactions', label: 'Transactions', icon: 'history' },
    { id: 'banks', label: 'Banks', icon: 'bank' },
    { id: 'withdrawals', label: 'Withdraw', icon: 'bank-transfer-out' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Wallet Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', maxHeight: 50 }}
        contentContainerStyle={{ paddingLeft: 12, paddingRight: 16, paddingVertical: 8, gap: 6 }}
      >
        {walletTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setWalletTab(tab.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: walletTab === tab.id ? '#DBEAFE' : '#F3F4F6',
              marginRight: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Icon name={tab.icon} size={16} color={walletTab === tab.id ? '#1D4ED8' : '#6B7280'} />
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: walletTab === tab.id ? '#1D4ED8' : '#374151'
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Wallet Content */}
      <ScrollView
        style={{ flex: 1, padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loadingState && !refreshing ? (
          <ActivityIndicator size="large" color="#1D4ED8" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Balance Tab */}
            {walletTab === 'balance' && (
              <View>
                <View style={{ backgroundColor: '#1D4ED8', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="wallet" size={48} color="#FFFFFF" style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 14, color: '#FFFFFF', opacity: 0.9, marginBottom: 8 }}>Current Balance</Text>
                  <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
                    {walletBalance !== null && walletBalance !== undefined ? formatAmount(walletBalance) : 'Loading...'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.8 }}>Available for withdrawal</Text>
                </View>

                {walletSummary && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                      <Icon name="trending-up" size={24} color="#10B981" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>
                        {walletSummary?.totalEarned ? formatAmount(walletSummary.totalEarned) : 'PKR 0.00'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Total Earned</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                      <Icon name="trending-down" size={24} color="#EF4444" style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#EF4444' }}>
                        {formatAmount(walletSummary.totalSpent)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Total Spent</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Transactions Tab */}
            {walletTab === 'transactions' && (
              <View>
                {transactions.map((item) => (
                  <View key={item.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: item.isCredit ? '#ECFDF5' : '#FEF2F2',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon
                        name={getTransactionIcon(item.type)}
                        size={20}
                        color={item.isCredit ? '#10B981' : '#EF4444'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{item.description}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{item.timeAgo}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: item.isCredit ? '#10B981' : '#EF4444' }}>
  {item.isCredit ? '+' : '-'}{item.amount ? formatAmount(item.amount) : '0'}
</Text>
                      <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
  Bal: {item.balance ? formatAmount(item.balance) : '0'}
</Text>
                    </View>
                  </View>
                ))}
                {transactions.length === 0 && (
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, alignItems: 'center' }}>
                    <Icon name="history" size={48} color="#D1D5DB" />
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 12 }}>No transactions yet</Text>
                  </View>
                )}
              </View>
            )}

            {/* Banks Tab */}
            {walletTab === 'banks' && (
              <View>
                <TouchableOpacity
                  style={{ backgroundColor: '#1D4ED8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 12 }}
                  onPress={() => setShowAddBankModal(true)}
                >
                  <Icon name="plus-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Add Bank Account</Text>
                </TouchableOpacity>

                {bankAccounts.map((account) => (
                  <View key={account.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{account.bankName}</Text>
                      {account.isPrimary && (
                        <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{account.accountTitle}</Text>
                    <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '600', marginTop: 2 }}>{account.accountNumber}</Text>

                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                      {!account.isPrimary && (
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: '#DBEAFE', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                          onPress={() => handleSetPrimaryAccount(account.id)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#1D4ED8' }}>Set Primary</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleDeleteBankAccount(account.id)}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {bankAccounts.length === 0 && (
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, alignItems: 'center' }}>
                    <Icon name="bank" size={48} color="#D1D5DB" />
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 12 }}>No bank accounts added</Text>
                  </View>
                )}

                {/* Add Bank Modal */}
                <Modal visible={showAddBankModal} animationType="slide" onRequestClose={() => setShowAddBankModal(false)}>
                  <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
                      <TouchableOpacity onPress={() => setShowAddBankModal(false)}>
                        <Icon name="close" size={24} color="#111827" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Add Bank Account</Text>
                      <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={{ flex: 1, padding: 16 }}>
                      <View style={{ gap: 14 }}>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Account Title *</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF' }}
                            placeholder="Enter account title"
                            value={bankForm.accountTitle}
                            onChangeText={(text) => setBankForm({ ...bankForm, accountTitle: text })}
                          />
                        </View>

                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Account Number *</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF' }}
                            placeholder="Enter account number"
                            value={bankForm.accountNumber}
                            onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text })}
                            keyboardType="numeric"
                          />
                        </View>

                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Bank Name *</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF' }}
                            placeholder="e.g., HBL, UBL, MCB"
                            value={bankForm.bankName}
                            onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
                          />
                        </View>

                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Branch Code (Optional)</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF' }}
                            placeholder="Enter branch code"
                            value={bankForm.branchCode}
                            onChangeText={(text) => setBankForm({ ...bankForm, branchCode: text })}
                          />
                        </View>
                      </View>
                    </ScrollView>

                    <View style={{ padding: 16 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#1D4ED8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 }}
                        onPress={handleAddBankAccount}
                      >
                        <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Add Bank Account</Text>
                      </TouchableOpacity>
                    </View>
                  </SafeAreaView>
                </Modal>
              </View>
            )}

            {/* Withdrawals Tab */}
            {walletTab === 'withdrawals' && (
              <View>
                <TouchableOpacity
                  style={{ backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 12 }}
                  onPress={() => {
                    if (bankAccounts.length === 0) {
                      Alert.alert('No Bank Account', 'Please add a bank account first', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Add Account', onPress: () => setWalletTab('banks') }
                      ]);
                      return;
                    }
                    setShowWithdrawModal(true);
                  }}
                >
                  <Icon name="bank-transfer-out" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Request Withdrawal</Text>
                </TouchableOpacity>

                {withdrawalSettings && (
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Withdrawal Information</Text>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="cash-check" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Min: {withdrawalSettings.minAmountDisplay}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="cash-multiple" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Max: {withdrawalSettings.maxAmountDisplay}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="percent" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>Fee: {withdrawalSettings.feePercent}%</Text>
                      </View>
                    </View>
                  </View>
                )}

                {withdrawals.map((withdrawal) => {
                  const statusStyle = getStatusBadgeType(withdrawal.status);
                  return (
                    <View key={withdrawal.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                      <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: statusStyle.text }}>{withdrawal.status}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{withdrawal.amount}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Fee: {withdrawal.fee} • Net: {withdrawal.netAmount}</Text>
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>{withdrawal.bankAccount.bankName} - {withdrawal.bankAccount.accountNumber}</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Requested: {withdrawal.timeAgo}</Text>
                      </View>
                      {withdrawal.status === 'PENDING' && (
                        <TouchableOpacity
                          style={{ backgroundColor: '#FEE2E2', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 10 }}
                          onPress={() => handleCancelWithdrawal(withdrawal.id)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>Cancel Withdrawal</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {withdrawals.length === 0 && (
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, alignItems: 'center' }}>
                    <Icon name="bank-transfer" size={48} color="#D1D5DB" />
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 12 }}>No withdrawals yet</Text>
                  </View>
                )}

                {/* Withdrawal Modal */}
                <Modal visible={showWithdrawModal} animationType="slide" onRequestClose={() => setShowWithdrawModal(false)}>
                  <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
                      <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                        <Icon name="close" size={24} color="#111827" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Request Withdrawal</Text>
                      <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={{ flex: 1, padding: 16 }}>
                      <View style={{ gap: 14 }}>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Select Bank Account</Text>
                          {bankAccounts.map((account) => (
                            <TouchableOpacity
                              key={account.id}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 2,
                                borderColor: selectedBankAccount === account.id ? '#1D4ED8' : '#E5E7EB',
                                backgroundColor: selectedBankAccount === account.id ? '#DBEAFE' : '#FFFFFF',
                                marginBottom: 8
                              }}
                              onPress={() => setSelectedBankAccount(account.id)}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                                {account.bankName} - {account.accountNumber}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{account.accountTitle}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Amount (PKR)</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF' }}
                            placeholder="Enter amount"
                            value={withdrawAmount}
                            onChangeText={setWithdrawAmount}
                            keyboardType="numeric"
                          />
                        </View>

                        {withdrawalSettings && withdrawAmount && (
                          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Summary</Text>
                            <View style={{ gap: 4 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: '#6B7280' }}>Amount</Text>
                                <Text style={{ fontSize: 11, fontWeight: '600' }}>PKR {parseFloat(withdrawAmount || 0).toFixed(2)}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 11, color: '#6B7280' }}>Fee ({withdrawalSettings.feePercent}%)</Text>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>
                                  - PKR {((parseFloat(withdrawAmount || 0) * withdrawalSettings.feePercent) / 100).toFixed(2)}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>Net Amount</Text>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
                                  PKR {(parseFloat(withdrawAmount || 0) - (parseFloat(withdrawAmount || 0) * withdrawalSettings.feePercent) / 100).toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    </ScrollView>

                    <View style={{ padding: 16 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 }}
                        onPress={handleRequestWithdrawal}
                      >
                        <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Submit Request</Text>
                      </TouchableOpacity>
                    </View>
                  </SafeAreaView>
                </Modal>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// -----------------------------
// Main App Component
// -----------------------------
const FreeRagmanPortal = ({ navigation, userStatus }) => {
  const [currentTab, setCurrentTab] = useState('requests');
  const [ragmanData, setRagmanData] = useState(userStatus?.ragman || null);
  
  const nav = useMemo(
    () => [
      { id: 'requests', label: 'Requests', icon: 'package-variant' },
      { id: 'accepted', label: 'Accepted', icon: 'check-circle' },
      { id: 'rates', label: 'Rates', icon: 'currency-usd' },
      { id: 'profile', label: 'Profile', icon: 'account' },
    ],
    []
  );

  const handleRefresh = useCallback(async () => {
    try {
      const data = await fetchRagmanProfile();
      if (data.user?.ragman) {
        setRagmanData(data.user.ragman);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <RNStatusBar barStyle="light-content" backgroundColor="#1D4ED8" />
      <View style={styles.headerWrap}>
        <HeaderBar
  title={
    currentTab === 'requests' ? 'Customer Requests' :
    currentTab === 'accepted' ? 'Accepted Requests' :
    currentTab === 'rates' ? 'Government Rates' :
    'My Profile'
  }
          subtitle="Free Account"
          rightIcon="account"
          onRightPress={() => setCurrentTab('profile')}
        />
      </View>

      <View style={styles.container}>
  {currentTab === 'requests' && <RequestsScreen ragmanData={ragmanData} navigation={navigation} />}
  {currentTab === 'accepted' && <AcceptedScreen navigation={navigation} />}
  {currentTab === 'rates' && <RatesScreen />}
  {currentTab === 'profile' && <ProfileScreen ragmanData={ragmanData} onRefresh={handleRefresh} navigation={navigation} />}
</View>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          {nav.map((item) => {
            const active = currentTab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.bottomBtn}
                onPress={() => setCurrentTab(item.id)}
                activeOpacity={0.9}
              >
                <Icon name={item.icon} size={20} color={active ? '#1D4ED8' : '#6B7280'} />
                <Text style={[styles.bottomLabel, active ? { color: '#1D4ED8', fontWeight: '700' } : null]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

// -----------------------------
// Styles (Updated)
// -----------------------------

const CARD_RADIUS = 12;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerWrap: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#BFDBFE',
    fontSize: 12,
    marginTop: 2,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  container: {
    flex: 1,
  },
  screenPad: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    padding: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Form elements
  label: {
    color: '#374151',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    color: '#111827',
  },
  bodyText: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },

  // Section styles
  sectionTitle: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  ghostBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ghostBtnText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabledGhost: {
    opacity: 0.6,
  },

  // Inline Info
  inlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inlineInfoText: {
    fontSize: 12,
  },

  // Badges
  badge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Status indicators
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    color: '#374151',
  },

  // Warning/Info cards
  freeCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  freeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeCardTitle: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 13,
  },
  freeCardText: {
    color: '#92400E',
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigBlue: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 24,
  },
  smallMuted: {
    color: '#6B7280',
    fontSize: 12,
  },
  mediumBold: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  mutedText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },

  // Request items
  reqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reqName: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  reqDetailRow: {
    marginTop: 6,
  },
  reqActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  acceptedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  viewDetailsBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeNotice: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeNoticeText: {
    color: '#4B5563',
    fontSize: 12,
    flex: 1,
  },
  acceptedNotice: {
    marginTop: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptedNoticeText: {
    color: '#047857',
    fontSize: 12,
    flex: 1,
  },

  // Upgrade
  upgradeBanner: {
    marginTop: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  upgradeTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  upgradeSubtitle: {
    color: '#E0E7FF',
    fontSize: 12,
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  upgradeBtnText: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 12,
  },

  // Profile
  avatarCircleLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTitle: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  profileSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bottomRow: {
    flexDirection: 'row',
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Stat row generic
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statRowLabel: {
    color: '#374151',
    fontSize: 13,
  },
  statRowValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal styles
  detailModal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  noItemsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  noteCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },


  backButton: {
    padding: 4,
    borderRadius: 8,
  },

  // Rates Screen styles
  ratesInfoCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ratesInfoTitle: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 13,
  },
  ratesInfoText: {
    color: '#1E40AF',
    fontSize: 12,
    marginTop: 2,
  },
  rateItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rateCategoryName: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  rateSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  rateValueContainer: {
    alignItems: 'flex-end',
  },
  rateValue: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 18,
  },
  rateUnit: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  lastUpdatedText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Professional Profile Screen Styles
  profileAnimatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 10,
  },
  profileScrollView: {
    flex: 1,
  },
  profileHeroSection: {
    backgroundColor: '#1D4ED8',
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  profileHeroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileHeroSubtitle: {
    fontSize: 14,
    color: '#BFDBFE',
    marginBottom: 8,
  },
  profileHeroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  profileHeroRatingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 4,
  },
  profileHeroRatingCount: {
    fontSize: 12,
    color: '#BFDBFE',
  },
  profileStatsContainer: {
    paddingHorizontal: 16,
    marginTop: -16,
    marginBottom: 12,
  },
  profileStatCardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  profileStatIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileStatValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  profileContentPad: {
    paddingHorizontal: 16,
  },
  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  profileVerificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  profileVerificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileVerificationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  profileInfoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  profileQuickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileQuickAction: {
    width: (width - 32 - 36) / 4,
    alignItems: 'center',
  },
  profileQuickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileQuickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  profileUpgradeBanner: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  profileUpgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileUpgradeBannerLeft: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileUpgradeBannerRight: {
    flex: 1,
  },
  profileUpgradeBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileUpgradeBannerSubtitle: {
    fontSize: 12,
    color: '#E0E7FF',
    lineHeight: 16,
  },

});

export default FreeRagmanPortal;