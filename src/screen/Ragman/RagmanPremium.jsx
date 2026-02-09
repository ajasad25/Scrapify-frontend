// src/screen/Ragman/RagmanPremium.jsx
// --------------------------------------------------------------
// Premium Ragman Portal with Real API Integration
// - Complete API integration with backend based on Prisma schema
// - Instant access to requests
// - Accepted Requests tab with chat and dispatch
// - Rates tab with live market data
// - Professional premium styling
// --------------------------------------------------------------

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  SafeAreaView,
  Dimensions,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// API imports
import {
  RAGMAN_ME_API,
  GET_PENDING_REQUESTS_API,
  ACCEPT_REQUEST_API,
  GET_MY_ACCEPTED_REQUESTS_API,
  GET_LATEST_RATES_API,
  GET_AVAILABLE_RIDERS_API,
  RAGMAN_ASSIGN_RIDER_API,
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

// API functions
const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('@jwt_token');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Throw error with backend message if available
      const errorMsg = data.error || data.message || `API Error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

const fetchRagmanProfile = () => makeAuthenticatedRequest(RAGMAN_ME_API);
const fetchPendingRequests = () => makeAuthenticatedRequest(GET_PENDING_REQUESTS_API);
const fetchMyAcceptedRequests = () => makeAuthenticatedRequest(GET_MY_ACCEPTED_REQUESTS_API);
const fetchLatestRates = () => makeAuthenticatedRequest(GET_LATEST_RATES_API);

const acceptRequest = (requestId) => 
  makeAuthenticatedRequest(ACCEPT_REQUEST_API, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });

// Helper functions
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr ago`;
  return `${Math.floor(diffInMinutes / 1440)} days ago`;
};

const calculateTotalValue = (items) => {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const weight = parseFloat(item.weight?.replace(/[^\d.]/g, '') || '0');
    const rate = parseFloat(item.customerRate || '0');
    const quantity = parseInt(item.quantity || '1');
    return sum + (weight * rate * quantity);
  }, 0);
};

const formatLocation = (location) => {
  if (!location) return 'Location not specified';
  // If it's coordinates, show as coordinates
  if (location.includes(',') && location.split(',').length === 2) {
    return `${location} (Coordinates)`;
  }
  return location.length > 30 ? location.substring(0, 30) + '...' : location;
};

// Convert rates object to array format
const convertRatesToArray = (ratesData) => {
  if (!ratesData || !ratesData.data) return [];
  
  const ratesObject = ratesData.data;
  return Object.keys(ratesObject).map((material, index) => {
    const rateInfo = ratesObject[material];
    return {
      id: index + 1,
      material: material.charAt(0).toUpperCase() + material.slice(1), // Capitalize first letter
      rate: rateInfo.rate,
      updatedAt: rateInfo.lastUpdated,
      trend: rateInfo.trend,
      // Convert trend string to simple format
      trendDirection: rateInfo.trend.includes('+') ? 'up' : 
                     rateInfo.trend.includes('-') ? 'down' : 'stable'
    };
  });
};

// -----------------------------
// Icon helper
// -----------------------------
const Icon = ({ name, size = 20, color = '#4B5563', style }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);

// -----------------------------
// Reusable UI Components
// -----------------------------
const PremiumCard = ({ children, style }) => (
  <View style={[styles.premiumCard, style]}>{children}</View>
);

const HeaderBar = ({ title, subtitle, rightIcon, onRightPress }) => (
  <View style={styles.headerBar}>
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Icon name="crown" size={18} color="#F59E0B" style={{ marginLeft: 8 }} />
      </View>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
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

const PremiumBadge = ({ text, type = 'premium' }) => {
  const config = {
    premium: { bg: '#7C3AED', color: '#FFFFFF' },
    verified: { bg: '#10B981', color: '#FFFFFF' },
    high: { bg: '#F59E0B', color: '#FFFFFF' },
    normal: { bg: '#E5E7EB', color: '#374151' },
    pending: { bg: '#EF4444', color: '#FFFFFF' },
    assigned: { bg: '#F59E0B', color: '#FFFFFF' },
    completed: { bg: '#10B981', color: '#FFFFFF' },
    cancelled: { bg: '#6B7280', color: '#FFFFFF' },
    accepted: { bg: '#10B981', color: '#FFFFFF' },
  };
  const { bg, color } = config[type] || config.normal;
  
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
};

const PrimaryButton = ({ title, onPress, disabled, icon, variant = 'primary', style }) => {
  const buttonStyle = variant === 'success' ? styles.successBtn : 
                      variant === 'danger' ? styles.dangerBtn : styles.primaryBtn;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[buttonStyle, disabled ? styles.btnDisabled : null, style]}
      activeOpacity={0.85}
    >
      {icon && <Icon name={icon} size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
};

// -----------------------------
// Rider Dispatch Modal - Real API Integration
// -----------------------------
const RiderDispatchModal = ({ visible, onClose, request, onDispatch }) => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    if (visible) {
      loadAvailableRiders();
    }
  }, [visible]);

  const loadAvailableRiders = async () => {
    try {
      setLoading(true);
      const data = await makeAuthenticatedRequest(GET_AVAILABLE_RIDERS_API);
      if (data.success) {
        setRiders(data.riders || []);
      }
    } catch (error) {
      console.error('Failed to load riders:', error);
      Alert.alert('Error', 'Failed to load available riders: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRider = async (rider) => {
  if (!request?. requestId || !rider?.id) {
    Alert.alert('Error', 'Invalid request or rider data');
    return;
  }

  setAssigning(rider. id);
  
  try {
    const payload = {
      requestId: request.requestId, // ✅ USE requestId instead of id
      riderId: parseInt(rider.id)
    };

    console.log('🚀 CORRECT PAYLOAD:', JSON.stringify(payload, null, 2));

    const response = await fetch(RAGMAN_ASSIGN_RIDER_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await AsyncStorage.getItem('@jwt_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      Alert.alert('Success', `${rider.name} has been assigned successfully!`);
      onClose();
      if (onDispatch) onDispatch(data. assignment);
    } else {
      Alert. alert('Assignment Failed', data.error || 'Unknown error occurred');
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    Alert.alert('Network Error', 'Please check your connection and try again');
  } finally {
    setAssigning(null);
  }
};


  const RiderCard = ({ rider }) => (
    <TouchableOpacity
      onPress={() => handleAssignRider(rider)}
      disabled={assigning !== null}
      style={[styles.riderCard, assigning === rider.id && styles.riderCardSelected]}
    >
      <View style={styles.riderAvatar}>
        <Icon name="account" size={24} color="#7C3AED" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.riderName}>{rider.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Icon name="phone" size={14} color="#6B7280" />
          <Text style={styles.riderPhone}> {rider.phone}</Text>
        </View>
        {rider.vehicle && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Icon name="bike" size={14} color="#6B7280" />
            <Text style={styles.riderDistance}> {rider.vehicle}</Text>
          </View>
        )}
        {rider.licenseNo && (
          <Text style={styles.riderDistance}>License: {rider.licenseNo}</Text>
        )}
      </View>
      {assigning === rider.id ? (
        <ActivityIndicator size="small" color="#7C3AED" />
      ) : (
        <Icon name="chevron-right" size={24} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} disabled={assigning !== null}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Dispatch Rider</Text>
          <TouchableOpacity onPress={loadAvailableRiders} disabled={loading}>
            <Icon name="refresh" size={24} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {/* Request Info */}
        {request && (
          <View style={styles.requestInfoCard}>
            <Text style={styles.sectionTitle}>Request Details</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              <View style={styles.inlineInfo}>
                <Icon name="account" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.inlineInfoText}>{request.customer?.name || 'Customer'}</Text>
              </View>
              <View style={styles.inlineInfo}>
                <Icon name="map-marker" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.inlineInfoText}>{formatLocation(request.location)}</Text>
              </View>
              <View style={styles.inlineInfo}>
                <Icon name="weight-kilogram" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.inlineInfoText}>{request.totalWeight || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={[styles.smallMuted, { marginTop: 12 }]}>Loading available riders...</Text>
            </View>
          ) : riders.length === 0 ? (
            <View style={styles.centerContainer}>
              <Icon name="account-off-outline" size={64} color="#D1D5DB" />
              <Text style={[styles.mutedText, { marginTop: 12 }]}>No riders available</Text>
              <Text style={[styles.smallMuted, { marginTop: 4, textAlign: 'center' }]}>
                All riders are currently busy with other assignments
              </Text>
              <PrimaryButton
                title="Refresh"
                onPress={loadAvailableRiders}
                icon="refresh"
                style={{ marginTop: 16, paddingHorizontal: 24 }}
              />
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                Available Riders ({riders.length})
              </Text>
              <View style={{ gap: 12 }}>
                {riders.map((rider) => (
                  <RiderCard key={rider.id} rider={rider} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// -----------------------------
// Premium Request Detail Modal
// -----------------------------
const PremiumRequestDetailModal = ({ visible, onClose, request, onAccept, isAccepting }) => {
  if (!request) return null;

  // Handle both old and new API response formats
  const items = request.CustomerRequestItem || request.items || [];
  
  // Calculate total value properly
  const totalValue = items.reduce((sum, item) => {
    const weight = parseFloat(item.weight?.replace(/[^\d.]/g, '') || '0');
    const rate = parseFloat(item.customerRate || '0');
    const quantity = parseInt(item.quantity || '1');
    return sum + (weight * rate * quantity);
  }, 0);

  // Get customer info - handle both response formats
  const customerName = request.users?.name || request.customer?.name || 'Customer';
  const customerPhone = request.users?.phone || request.customer?.phone;
  const isVerified = request.users?.isVerified || request.customer?.isVerified;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Request Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Customer Information Card */}
          <PremiumCard>
            <View style={styles.premiumProfileSectionHeader}>
              <Icon name="account-circle" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.premiumProfileSectionTitle}>Customer Information</Text>
            </View>
            <View style={{ gap: 10, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{customerName}</Text>
                {isVerified && (
                  <Icon name="shield-check" size={16} color="#10B981" style={{ marginLeft: 8 }} />
                )}
              </View>
              <InlineInfo icon="map-marker" text={formatLocation(request.location)} color="#374151" />
              <InlineInfo icon="clock-time-four" text={formatTimeAgo(request.createdAt)} color="#10B981" />
              {customerPhone && (
                <InlineInfo icon="phone" text={customerPhone} color="#6B7280" />
              )}
            </View>
          </PremiumCard>

          {/* Request Summary Card */}
          <PremiumCard>
            <View style={styles.premiumProfileSectionHeader}>
              <Icon name="chart-box" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.premiumProfileSectionTitle}>Request Summary</Text>
            </View>
            <View style={{ gap: 12, marginTop: 12 }}>
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="weight-kilogram" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Total Weight</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                  {request.totalWeight || 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="star-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Total Points</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                  {request.totalPoints || 0} pts
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="currency-usd" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Estimated Value</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#059669' }}>
                  PKR {totalValue.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="package-variant" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Items Count</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                  {items.length} {items.length === 1 ? 'category' : 'categories'}
                </Text>
              </View>
            </View>
          </PremiumCard>

          {/* Items Details Card */}
          <PremiumCard>
            <View style={styles.premiumProfileSectionHeader}>
              <Icon name="format-list-bulleted" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.premiumProfileSectionTitle}>Items Details</Text>
            </View>
            <View style={{ gap: 10, marginTop: 12 }}>
              {items && items.length > 0 ? (
                items.map((item, index) => {
                  const weight = parseFloat(item.weight?.replace(/[^\d.]/g, '') || '0');
                  const rate = parseFloat(item.customerRate || '0');
                  const quantity = parseInt(item.quantity || '1');
                  const itemValue = weight * rate * quantity;

                  return (
                    <View key={index} style={styles.premiumItemDetailCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemDetailName}>{item.category || 'Item'}</Text>
                        <Text style={styles.itemDetailInfo}>
                          {item.weight} × {quantity} = {item.points || 0} pts
                        </Text>
                        <Text style={styles.itemDetailRate}>Rate: PKR {rate.toFixed(2)}/kg</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                        <Text style={styles.itemDetailValue}>PKR {itemValue.toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', paddingVertical: 16 }}>
                  No items details available
                </Text>
              )}
            </View>
          </PremiumCard>

          {/* Information Notice */}
          <View style={styles.premiumFeature}>
            <Icon name="information-outline" size={16} color="#7C3AED" style={{ marginRight: 8 }} />
            <Text style={[styles.premiumFeatureText, { color: '#7C3AED' }]}>
              Premium instant access • Full request visibility • Direct customer contact
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.modalFooter}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={onClose}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, isAccepting && styles.btnDisabled, { flex: 2 }]}
              onPress={() => onAccept(request.id)}
              disabled={isAccepting}
              activeOpacity={0.85}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.acceptBtnText}>Accept Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// -----------------------------
// Premium Requests Screen
// -----------------------------
const PremiumRequestsScreen = ({ pendingRequests, onAcceptRequest, loading, onRefresh }) => {
  const [acceptingId, setAcceptingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleAcceptRequest = async (itemId) => {
    setAcceptingId(itemId);
    setShowDetailModal(false);
    try {
      const item = selectedRequest || pendingRequests.find(r => r.id === itemId);
      await onAcceptRequest(item);
      Alert.alert(
        'Request Accepted Successfully',
        'Customer has been notified. You can now chat or dispatch a rider from the Accepted Requests tab.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  const showRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const RequestItem = ({ item }) => (
    <TouchableOpacity onPress={() => showRequestDetails(item)} activeOpacity={0.95}>
      <PremiumCard style={{ padding: 16 }}>
      <View style={styles.reqHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.reqName}>
              {item.users?.name || 'Customer'}
            </Text>
            {item.users?.isVerified && (
              <Icon name="shield-check" size={16} color="#10B981" style={{ marginLeft: 6 }} />
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.customerRating}>4.5</Text>
            </View>
          </View>
          <InlineInfo icon="map-marker" text={formatLocation(item.location)} />
          <InlineInfo 
            icon="clock-time-four" 
            text={`${formatTimeAgo(item.createdAt)}`} 
            color="#10B981" 
          />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <PremiumBadge text="PREMIUM" type="premium" />
          <PremiumBadge 
            text={item.status?.toUpperCase() || 'PENDING'} 
            type={item.status?.toLowerCase() || 'pending'} 
          />
        </View>
      </View>

      <View style={styles.reqDetails}>
        <InlineInfo 
          icon="package-variant" 
          text={`Items: ${item.CustomerRequestItem?.length || 0} categories`} 
          color="#7C3AED" 
        />
        <InlineInfo icon="weight-kilogram" text={`Weight: ${item.totalWeight}`} color="#DC2626" />
        <InlineInfo 
          icon="currency-usd" 
          text={`Value: PKR ${Math.round(item.totalValue || 0)}`} 
          color="#059669" 
        />
        <InlineInfo 
          icon="star-outline" 
          text={`Points: ${item.totalPoints || 0}`} 
          color="#7C3AED" 
        />
      </View>

      <View style={styles.premiumActions}>
        <TouchableOpacity
          style={[styles.acceptBtn, acceptingId === item.id && styles.btnDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            handleAcceptRequest(item.id);
          }}
          disabled={acceptingId === item.id}
          activeOpacity={0.85}
        >
          {acceptingId === item.id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptBtnText}>Accept Request</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.premiumFeature}>
        <Icon name="lightning-bolt" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
        <Text style={styles.premiumFeatureText}>
          Tap to view full details • Instant visibility • Premium priority
        </Text>
      </View>
    </PremiumCard>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.screenPad} 
      contentContainerStyle={{ paddingBottom: 90 }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    >
      {/* Real-time indicator */}
      <View style={styles.realTimeIndicator}>
        <View style={styles.pulsingDot} />
        <Text style={styles.realTimeText}>Live feed • {pendingRequests.length} new requests</Text>
      </View>

      {/* Requests List */}
      {loading ? (
        <PremiumCard style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={[styles.smallMuted, { marginTop: 8 }]}>Loading requests...</Text>
        </PremiumCard>
      ) : pendingRequests.length === 0 ? (
        <PremiumCard style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Icon name="package-variant" size={44} color="#7C3AED" />
          <Text style={styles.mutedText}>All caught up!</Text>
          <Text style={styles.smallMuted}>New requests will appear instantly</Text>
        </PremiumCard>
      ) : (
        <View style={{ gap: 14 }}>
          {pendingRequests.map(r => <RequestItem key={r.id} item={r} />)}
        </View>
      )}

      <PremiumRequestDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        request={selectedRequest}
        onAccept={handleAcceptRequest}
        isAccepting={acceptingId === selectedRequest?.id}
      />
    </ScrollView>
  );
};

// -----------------------------
// Accepted Requests Screen
// -----------------------------
const AcceptedRequestsScreen = ({ acceptedRequests, loading, onRefresh, navigation, onRiderAssigned }) => {
  const [dispatchModal, setDispatchModal] = useState({ visible: false, request: null });

  const handleChatWithCustomer = (request) => {
    navigation.navigate('RagmanChatScreen', {
      request,
      customerPhone: request.customer?.phone || '+92-300-0000000'
    });
  };

  
  const handleDispatchRider = (request) => {
  console.log('📋 Opening rider selection for request: ');
  console.log('Request ID (id):', request.id);
  console.log('Request ID (requestId):', request.requestId); // ✅ Log both
  console.log('Status:', request.status);

  // ✅ Updated validation
  if (!request. requestId) {
    Alert. alert(
      'Invalid Request',
      'This request is missing a requestId and cannot be assigned.  Please refresh the list.'
    );
    return;
  }

  if (request.status !== 'ASSIGNED') {
    Alert.alert(
      'Invalid Request Status',
      `Cannot assign rider to a request with status "${request.status}".\n\nOnly requests with status "ASSIGNED" can have riders assigned.`
    );
    return;
  }

  setDispatchModal({
    visible: true,
    request
  });
};

  const handleRiderAssigned = (assignment) => {
    console.log('✅ Rider assigned successfully:', assignment);
    // Refresh the accepted requests list
    if (onRiderAssigned) {
      onRiderAssigned(assignment);
    }
    setDispatchModal({ visible: false, request: null });
  };

  const renderAcceptedRequest = ({ item }) => (
    <PremiumCard style={{ padding: 16 }}>
      <View style={styles.reqHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.reqName}>{item.customer?.name || 'Customer'}</Text>
            {item.customer?.isVerified && (
              <Icon name="shield-check" size={16} color="#10B981" style={{ marginLeft: 6 }} />
            )}
          </View>
          <InlineInfo icon="map-marker" text={formatLocation(item.location)} />
          <InlineInfo 
            icon="clock-time-four" 
            text={`Accepted: ${formatTimeAgo(item.acceptedAt)}`} 
            color="#10B981" 
          />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <PremiumBadge
            text={item.status?.toUpperCase() || 'ASSIGNED'}
            type={item.status?.toLowerCase() || 'assigned'}
          />
          {item.status === 'ASSIGNED' && (
            <Text style={{ fontSize: 10, color: '#F59E0B', marginTop: 4, fontWeight: '600' }}>
              Ready for dispatch
            </Text>
          )}
        </View>
      </View>

      <View style={styles.reqDetails}>
        <InlineInfo 
          icon="package-variant" 
          text={`Items: ${item.items?.map(i => i.category).join(', ') || 'Mixed items'}`} 
          color="#7C3AED" 
        />
        <InlineInfo icon="weight-kilogram" text={`Weight: ${item.totalWeight}`} color="#DC2626" />
        <InlineInfo 
          icon="currency-usd" 
          text={`Value: PKR ${Math.round(item.totalValue)}`} 
          color="#059669" 
        />
      </View>

      <View style={styles.premiumActions}>
        <TouchableOpacity
          style={styles.chatActionBtn}
          onPress={() => handleChatWithCustomer(item)}
          activeOpacity={0.85}
        >
          <Icon name="message-text" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Chat with Customer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.dispatchActionBtn}
          onPress={() => handleDispatchRider(item)}
          activeOpacity={0.85}
        >
          <Icon name="truck-delivery" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Dispatch Rider</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.premiumFeature}>
        <Icon name="check-circle" size={14} color="#10B981" style={{ marginRight: 6 }} />
        <Text style={[styles.premiumFeatureText, { color: '#10B981' }]}>
          Request accepted • Customer notified • Ready for collection
        </Text>
      </View>
    </PremiumCard>
  );

  return (
    <View style={styles.screenPad}>
      <FlatList
        data={acceptedRequests}
        renderItem={renderAcceptedRequest}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <PremiumCard style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Icon name="check-circle-outline" size={44} color="#6B7280" />
            <Text style={styles.mutedText}>No accepted requests yet</Text>
            <Text style={styles.smallMuted}>Accepted requests will appear here</Text>
          </PremiumCard>
        }
      />

      <RiderDispatchModal
        visible={dispatchModal.visible}
        onClose={() => setDispatchModal({ visible: false, request: null })}
        request={dispatchModal.request}
        onDispatch={handleRiderAssigned}
      />
    </View>
  );
};

// -----------------------------
// Rates Screen - FIXED
// -----------------------------
const RatesScreen = ({ rates, loading, onRefresh }) => {
  console.log('RatesScreen - rates:', rates);
  console.log('RatesScreen - rates length:', rates?.length);

  const renderRateItem = ({ item }) => (
    <PremiumCard style={styles.rateCard}>
      <View style={styles.rateHeader}>
        <Text style={styles.rateMaterial}>{item.material}</Text>
        <Text style={styles.rateValue}>PKR {item.rate}/kg</Text>
      </View>
      <View style={styles.rateMeta}>
        <Text style={styles.rateDate}>
          Updated: {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
        {item.trendDirection !== 'stable' && (
          <View style={styles.rateTrend}>
            <Icon
              name={item.trendDirection === 'up' ? 'trending-up' : 'trending-down'}
              size={16}
              color={item.trendDirection === 'up' ? '#10B981' : '#EF4444'}
            />
            <Text
              style={[
                styles.trendText,
                { color: item.trendDirection === 'up' ? '#10B981' : '#EF4444' }
              ]}
            >
              {item.trend}
            </Text>
          </View>
        )}
      </View>
    </PremiumCard>
  );

  return (
    <View style={styles.screenPad}>
      <View style={styles.ratesHeader}>
        <Text style={styles.sectionTitle}>Latest Market Rates</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={rates || []}
        renderItem={renderRateItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <PremiumCard style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={[styles.smallMuted, { marginTop: 8 }]}>Loading rates...</Text>
            </PremiumCard>
          ) : (
            <PremiumCard style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Icon name="cash" size={44} color="#6B7280" />
              <Text style={styles.mutedText}>No rates available</Text>
              <Text style={styles.smallMuted}>Market rates will appear here when available</Text>
              <TouchableOpacity onPress={onRefresh} style={{ marginTop: 12 }}>
                <Text style={{ color: '#7C3AED', fontWeight: '600' }}>Tap to refresh</Text>
              </TouchableOpacity>
            </PremiumCard>
          )
        }
      />
    </View>
  );
};

// -----------------------------
// Ragman Wallet Screen
// -----------------------------
const WalletScreen = ({ loading, onRefresh }) => {
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

  // Load wallet data
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
    try {
      Alert.alert(
        'Delete Bank Account',
        'Are you sure you want to delete this bank account?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const response = await makeAuthenticatedRequest(DELETE_BANK_ACCOUNT_API(accountId), {
                method: 'DELETE'
              });
              if (response.success) {
                Alert.alert('Success', 'Bank account deleted');
                loadWalletData();
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete bank account');
    }
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
    try {
      Alert.alert(
        'Cancel Withdrawal',
        'Are you sure you want to cancel this withdrawal request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              const response = await makeAuthenticatedRequest(CANCEL_WITHDRAWAL_API, {
                method: 'POST',
                body: JSON.stringify({ withdrawalId })
              });
              if (response.success) {
                Alert.alert('Success', 'Withdrawal cancelled and amount refunded');
                loadWalletData();
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel withdrawal');
    }
  };

  const formatAmount = (amount) => {
    if (typeof amount === 'string') return amount;
    return `PKR ${(amount / 100).toFixed(2)}`;
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

  const getTransactionColor = (type, isCredit) => {
    if (isCredit) return '#10B981';
    return '#EF4444';
  };

  const getStatusBadgeType = (status) => {
    const statusMap = {
      PENDING: 'pending',
      APPROVED: 'verified',
      PROCESSING: 'assigned',
      COMPLETED: 'completed',
      REJECTED: 'cancelled',
      CANCELLED: 'cancelled'
    };
    return statusMap[status] || 'normal';
  };

  // Render Balance Tab
  const renderBalanceTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Balance Card */}
      <PremiumCard style={{ padding: 20, alignItems: 'center' }}>
        <Icon name="wallet" size={48} color="#7C3AED" style={{ marginBottom: 12 }} />
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>Current Balance</Text>
        <Text style={{ fontSize: 36, fontWeight: '800', color: '#7C3AED', marginBottom: 4 }}>
          {walletBalance !== null ? formatAmount(walletBalance) : 'Loading...'}
        </Text>
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Available for withdrawal</Text>
      </PremiumCard>

      {/* Summary Stats */}
      {walletSummary && (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <PremiumCard style={{ flex: 1, padding: 16, alignItems: 'center' }}>
            <Icon name="trending-up" size={24} color="#10B981" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#10B981' }}>
              {formatAmount(walletSummary.totalEarned)}
            </Text>
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Total Earned</Text>
          </PremiumCard>

          <PremiumCard style={{ flex: 1, padding: 16, alignItems: 'center' }}>
            <Icon name="trending-down" size={24} color="#EF4444" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#EF4444' }}>
              {formatAmount(walletSummary.totalSpent)}
            </Text>
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Total Spent</Text>
          </PremiumCard>
        </View>
      )}

      {/* Recent Activity */}
      {walletSummary?.recentActivity && walletSummary.recentActivity.length > 0 && (
        <PremiumCard>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {walletSummary.recentActivity.map((activity, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon
                  name={getTransactionIcon(activity.type)}
                  size={20}
                  color={getTransactionColor(activity.type, activity.amount > 0)}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                    {activity.description}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>{activity.timeAgo}</Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: activity.amount > 0 ? '#10B981' : '#EF4444'
                }}>
                  {activity.amount > 0 ? '+' : ''}{formatAmount(Math.abs(activity.amount))}
                </Text>
              </View>
            ))}
          </View>
        </PremiumCard>
      )}
    </ScrollView>
  );

  // Render Transactions Tab
  const renderTransactionsTab = () => (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => (
        <PremiumCard style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: item.isCredit ? '#ECFDF5' : '#FEF2F2',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon
              name={getTransactionIcon(item.type)}
              size={22}
              color={getTransactionColor(item.type, item.isCredit)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
              {item.description}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.timeAgo}</Text>
            {item.reference && (
              <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                Ref: {item.reference}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: item.isCredit ? '#10B981' : '#EF4444'
            }}>
              {item.isCredit ? '+' : '-'}{formatAmount(item.amount)}
            </Text>
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              Balance: {formatAmount(item.balance)}
            </Text>
          </View>
        </PremiumCard>
      )}
      ListEmptyComponent={
        <PremiumCard style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Icon name="history" size={48} color="#D1D5DB" />
          <Text style={[styles.mutedText, { marginTop: 12 }]}>No transactions yet</Text>
        </PremiumCard>
      }
    />
  );

  // Render Bank Accounts Tab
  const renderBankAccountsTab = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <PrimaryButton
        title="Add Bank Account"
        icon="plus"
        onPress={() => setShowAddBankModal(true)}
        style={{ marginBottom: 16 }}
      />

      {bankAccounts.map((account) => (
        <PremiumCard key={account.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {account.bankName}
                </Text>
                {account.isPrimary && <PremiumBadge text="PRIMARY" type="verified" />}
                {account.isVerified && <Icon name="check-circle" size={16} color="#10B981" />}
              </View>
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                {account.accountTitle}
              </Text>
              <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600', marginTop: 2 }}>
                {account.accountNumber}
              </Text>
              {account.branchCode && (
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  Branch: {account.branchCode}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!account.isPrimary && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, paddingVertical: 8 }]}
                onPress={() => handleSetPrimaryAccount(account.id)}
              >
                <Text style={[styles.secondaryBtnText, { fontSize: 12 }]}>Set as Primary</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.dangerBtn, { flex: 1, paddingVertical: 8 }]}
              onPress={() => handleDeleteBankAccount(account.id)}
            >
              <Text style={[styles.primaryBtnText, { fontSize: 12 }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </PremiumCard>
      ))}

      {bankAccounts.length === 0 && (
        <PremiumCard style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Icon name="bank" size={48} color="#D1D5DB" />
          <Text style={[styles.mutedText, { marginTop: 12 }]}>No bank accounts added</Text>
          <Text style={[styles.smallMuted, { marginTop: 4 }]}>
            Add a bank account to withdraw your earnings
          </Text>
        </PremiumCard>
      )}

      {/* Add Bank Account Modal */}
      <Modal visible={showAddBankModal} animationType="slide" onRequestClose={() => setShowAddBankModal(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddBankModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Bank Account</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Account Title *
                </Text>
                <TextInput
                  style={styles.textInputField}
                  placeholder="Enter account title"
                  value={bankForm.accountTitle}
                  onChangeText={(text) => setBankForm({ ...bankForm, accountTitle: text })}
                />
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Account Number *
                </Text>
                <TextInput
                  style={styles.textInputField}
                  placeholder="Enter account number"
                  value={bankForm.accountNumber}
                  onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text })}
                  keyboardType="numeric"
                />
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Bank Name *
                </Text>
                <TextInput
                  style={styles.textInputField}
                  placeholder="e.g., HBL, UBL, MCB"
                  value={bankForm.bankName}
                  onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
                />
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Branch Code (Optional)
                </Text>
                <TextInput
                  style={styles.textInputField}
                  placeholder="Enter branch code"
                  value={bankForm.branchCode}
                  onChangeText={(text) => setBankForm({ ...bankForm, branchCode: text })}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <PrimaryButton
              title="Add Bank Account"
              onPress={handleAddBankAccount}
              icon="check"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );

  // Render Withdrawals Tab
  const renderWithdrawalsTab = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      {/* Request Withdrawal Button - TOP */}
      <TouchableOpacity
        style={{
          backgroundColor: '#10B981',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
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
        <Icon name="bank-transfer-out" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
          Request Withdrawal
        </Text>
      </TouchableOpacity>

      {/* Withdrawal Settings Card */}
      {withdrawalSettings && (
        <PremiumCard style={{ padding: 16, marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Withdrawal Information</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <InlineInfo
              icon="cash-check"
              text={`Minimum: ${withdrawalSettings.minAmountDisplay}`}
              color="#6B7280"
            />
            <InlineInfo
              icon="cash-multiple"
              text={`Maximum: ${withdrawalSettings.maxAmountDisplay}`}
              color="#6B7280"
            />
            <InlineInfo
              icon="percent"
              text={`Fee: ${withdrawalSettings.feePercent}%`}
              color="#6B7280"
            />
            <InlineInfo
              icon="clock-outline"
              text={`Processing: ${withdrawalSettings.processingHours} hours`}
              color="#6B7280"
            />
          </View>
        </PremiumCard>
      )}

      {/* Withdrawals List */}
      {withdrawals.map((withdrawal) => (
        <PremiumCard key={withdrawal.id} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <PremiumBadge text={withdrawal.status} type={getStatusBadgeType(withdrawal.status)} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 }}>
                {withdrawal.amount}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Fee: {withdrawal.fee} • Net: {withdrawal.netAmount}
              </Text>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <InlineInfo
              icon="bank"
              text={`${withdrawal.bankAccount.bankName} - ${withdrawal.bankAccount.accountNumber}`}
            />
            <InlineInfo
              icon="clock-outline"
              text={`Requested: ${withdrawal.timeAgo}`}
            />
            {withdrawal.completedAt && (
              <InlineInfo
                icon="check-circle"
                text={`Completed: ${new Date(withdrawal.completedAt).toLocaleDateString()}`}
                color="#10B981"
              />
            )}
            {withdrawal.rejectionReason && (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                Reason: {withdrawal.rejectionReason}
              </Text>
            )}
          </View>

          {withdrawal.status === 'PENDING' && (
            <TouchableOpacity
              style={[styles.dangerBtn, { marginTop: 12, paddingVertical: 8 }]}
              onPress={() => handleCancelWithdrawal(withdrawal.id)}
            >
              <Text style={styles.primaryBtnText}>Cancel Withdrawal</Text>
            </TouchableOpacity>
          )}
        </PremiumCard>
      ))}

      {withdrawals.length === 0 && (
        <PremiumCard style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Icon name="bank-transfer" size={48} color="#D1D5DB" />
          <Text style={[styles.mutedText, { marginTop: 12 }]}>No withdrawals yet</Text>
        </PremiumCard>
      )}

      {/* Withdrawal Request Modal */}
      <Modal visible={showWithdrawModal} animationType="slide" onRequestClose={() => setShowWithdrawModal(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Withdrawal</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Select Bank Account
                </Text>
                {bankAccounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selectedBankAccount === account.id ? '#7C3AED' : '#E5E7EB',
                      backgroundColor: selectedBankAccount === account.id ? '#F5F3FF' : '#FFFFFF',
                      marginBottom: 10
                    }}
                    onPress={() => setSelectedBankAccount(account.id)}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      {account.bankName} - {account.accountNumber}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {account.accountTitle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Amount (PKR)
                </Text>
                <TextInput
                  style={styles.textInputField}
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  keyboardType="numeric"
                />
                {withdrawalSettings && (
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                    Min: {withdrawalSettings.minAmountDisplay} • Max: {withdrawalSettings.maxAmountDisplay}
                  </Text>
                )}
              </View>

              {withdrawalSettings && withdrawAmount && (
                <PremiumCard style={{ backgroundColor: '#F9FAFB', padding: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Withdrawal Summary
                  </Text>
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Amount</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600' }}>
                        PKR {parseFloat(withdrawAmount || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        Fee ({withdrawalSettings.feePercent}%)
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>
                        - PKR {((parseFloat(withdrawAmount || 0) * withdrawalSettings.feePercent) / 100).toFixed(2)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Net Amount</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                        PKR {(parseFloat(withdrawAmount || 0) - (parseFloat(withdrawAmount || 0) * withdrawalSettings.feePercent) / 100).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </PremiumCard>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <PrimaryButton
              title="Submit Withdrawal Request"
              onPress={handleRequestWithdrawal}
              icon="check"
              variant="success"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );

  const walletTabs = [
    { id: 'balance', label: 'Balance', icon: 'wallet' },
    { id: 'transactions', label: 'Transactions', icon: 'history' },
    { id: 'banks', label: 'Bank Accounts', icon: 'bank' },
    { id: 'withdrawals', label: 'Withdrawals', icon: 'bank-transfer-out' },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Wallet Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
      >
        {walletTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setWalletTab(tab.id)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: walletTab === tab.id ? '#7C3AED' : '#F3F4F6',
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Icon name={tab.icon} size={18} color={walletTab === tab.id ? '#FFFFFF' : '#6B7280'} />
            <Text style={{
              fontSize: 13,
              fontWeight: '600',
              color: walletTab === tab.id ? '#FFFFFF' : '#374151'
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Wallet Content */}
      <View style={[styles.screenPad, { flex: 1 }]}>
        {loadingState && !refreshing ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <>
            {walletTab === 'balance' && renderBalanceTab()}
            {walletTab === 'transactions' && renderTransactionsTab()}
            {walletTab === 'banks' && renderBankAccountsTab()}
            {walletTab === 'withdrawals' && renderWithdrawalsTab()}
          </>
        )}
      </View>
    </View>
  );
};

// -----------------------------
// Profile Screen - FIXED
// -----------------------------
const ProfileScreen = ({ profile, onRefresh, navigation, onLogout }) => {
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchStats();
  }, [profile]);

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
    await fetchStats();
    onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: onLogout
        }
      ]
    );
  };

  if (!profile) {
    return (
      <View style={[styles.screenPad, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.mutedText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Animated Header Background */}
      <Animated.View style={[styles.profileAnimatedHeader, { opacity: headerOpacity }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#7C3AED' }]} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefreshProfile} tintColor="#7C3AED" />
        }
      >
        {/* Hero Section */}
        <View style={styles.premiumProfileHeroSection}>
          <Icon name="crown" size={32} color="#F59E0B" style={{ marginBottom: 8 }} />
          <View style={styles.premiumProfileAvatarLarge}>
            {profile.profilePicture ? (
              <Image source={{ uri: profile.profilePicture }} style={styles.avatarImg} />
            ) : (
              <Icon name="account" size={52} color="#7C3AED" />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={styles.premiumProfileHeroName}>{profile.name || 'Business Name'}</Text>
            {profile.ragman?.verificationStatus && (
              <Icon name="shield-check" size={22} color="#10B981" style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={styles.premiumProfileHeroSubtitle}>{profile.email}</Text>
          <View style={styles.premiumProfileHeroRating}>
            <Icon name="star" size={20} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.premiumProfileHeroRatingText}>
              {profile.ragman?.averageRating?.toFixed(1) || '4.8'}
            </Text>
            <Text style={styles.premiumProfileHeroRatingCount}>
              ({profile.ragman?.completedCollections || '0'} completed)
            </Text>
          </View>
          <PremiumBadge text="PREMIUM" type="premium" style={{ marginTop: 8 }} />
        </View>

        {/* Stats Dashboard */}
        <View style={styles.premiumProfileStatsContainer}>
          <View style={styles.premiumProfileStatCardRow}>
            <View style={[styles.premiumProfileStatCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
              <View style={[styles.premiumProfileStatIconCircle, { backgroundColor: '#7C3AED' }]}>
                <Icon name="briefcase-check" size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.premiumProfileStatValue, { color: '#7C3AED' }]}>{stats.totalAccepted}</Text>
              <Text style={styles.premiumProfileStatLabel}>Total Accepted</Text>
            </View>

            <View style={[styles.premiumProfileStatCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <View style={[styles.premiumProfileStatIconCircle, { backgroundColor: '#10B981' }]}>
                <Icon name="check-circle" size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.premiumProfileStatValue, { color: '#10B981' }]}>{stats.completed}</Text>
              <Text style={styles.premiumProfileStatLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.premiumProfileStatCardRow}>
            <View style={[styles.premiumProfileStatCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <View style={[styles.premiumProfileStatIconCircle, { backgroundColor: '#F59E0B' }]}>
                <Icon name="clock-fast" size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.premiumProfileStatValue, { color: '#F59E0B' }]}>{stats.activeRequests}</Text>
              <Text style={styles.premiumProfileStatLabel}>Active</Text>
            </View>

          </View>
        </View>

        {/* Content Section */}
        <View style={styles.premiumProfileContentPad}>
          {/* Premium Benefits Banner */}
          <PremiumCard style={styles.premiumBenefitsBanner}>
            <View style={styles.premiumBenefitsHeader}>
              <Icon name="crown" size={24} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.premiumBenefitsTitle}>Premium Benefits Active</Text>
            </View>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Icon name="lightning-bolt" size={18} color="#F59E0B" />
                <Text style={styles.featureText}>Instant request visibility</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="message-text" size={18} color="#7C3AED" />
                <Text style={styles.featureText}>Direct customer chat</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="truck-delivery" size={18} color="#059669" />
                <Text style={styles.featureText}>Rider dispatch service</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="shield-check" size={18} color="#10B981" />
                <Text style={styles.featureText}>Verified business badge</Text>
              </View>
            </View>
          </PremiumCard>

          {/* Verification Status */}
          <PremiumCard>
            <View style={styles.premiumProfileSectionHeader}>
              <Icon name="shield-check-outline" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.premiumProfileSectionTitle}>Verification Status</Text>
            </View>
            <View style={styles.verificationList}>
              <View style={styles.premiumProfileVerificationRow}>
                <View style={styles.premiumProfileVerificationLeft}>
                  <Icon
                    name={profile.isVerified ? "check-circle" : "close-circle"}
                    size={20}
                    color={profile.isVerified ? "#10B981" : "#EF4444"}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.premiumProfileVerificationText}>Email Verification</Text>
                </View>
                <PremiumBadge
                  text={profile.isVerified ? 'Verified' : 'Pending'}
                  type={profile.isVerified ? 'verified' : 'pending'}
                />
              </View>

              <View style={styles.premiumProfileVerificationRow}>
                <View style={styles.premiumProfileVerificationLeft}>
                  <Icon
                    name={profile.ragman?.emailVerifyStatus ? "check-circle" : "close-circle"}
                    size={20}
                    color={profile.ragman?.emailVerifyStatus ? "#10B981" : "#EF4444"}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.premiumProfileVerificationText}>Ragman Email Verification</Text>
                </View>
                <PremiumBadge
                  text={profile.ragman?.emailVerifyStatus ? 'Verified' : 'Pending'}
                  type={profile.ragman?.emailVerifyStatus ? 'verified' : 'pending'}
                />
              </View>

              <View style={styles.premiumProfileVerificationRow}>
                <View style={styles.premiumProfileVerificationLeft}>
                  <Icon
                    name={profile.ragman?.verificationStatus ? "check-circle" : "close-circle"}
                    size={20}
                    color={profile.ragman?.verificationStatus ? "#10B981" : "#EF4444"}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.premiumProfileVerificationText}>Business Verification</Text>
                </View>
                <PremiumBadge
                  text={profile.ragman?.verificationStatus ? 'Verified' : 'Pending Review'}
                  type={profile.ragman?.verificationStatus ? 'verified' : 'pending'}
                />
              </View>
            </View>
          </PremiumCard>

          {/* Business Information */}
          <PremiumCard>
            <View style={styles.premiumProfileSectionHeader}>
              <Icon name="card-account-details-outline" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.premiumProfileSectionTitle}>Business Information</Text>
            </View>
            <View style={{ gap: 10, marginTop: 12 }}>
              <View style={styles.premiumProfileInfoRow}>
                <Icon name="email-outline" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                <Text style={styles.premiumProfileInfoText}>{profile.email}</Text>
              </View>
              {profile.phone && (
                <View style={styles.premiumProfileInfoRow}>
                  <Icon name="phone-outline" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                  <Text style={styles.premiumProfileInfoText}>{profile.phone}</Text>
                </View>
              )}
              {profile.ragman?.verificationDetails?.phoneNumber && (
                <View style={styles.premiumProfileInfoRow}>
                  <Icon name="phone-classic" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                  <Text style={styles.premiumProfileInfoText}>{profile.ragman.verificationDetails.phoneNumber}</Text>
                </View>
              )}
              {profile.ragman?.verificationDetails?.cnic && (
                <View style={styles.premiumProfileInfoRow}>
                  <Icon name="card-account-details" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                  <Text style={styles.premiumProfileInfoText}>CNIC: {profile.ragman.verificationDetails.cnic}</Text>
                </View>
              )}
              {profile.ragman?.verificationDetails?.ntn && (
                <View style={styles.premiumProfileInfoRow}>
                  <Icon name="file-document" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                  <Text style={styles.premiumProfileInfoText}>NTN: {profile.ragman.verificationDetails.ntn}</Text>
                </View>
              )}
              <View style={styles.premiumProfileInfoRow}>
                <Icon name="calendar" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                <Text style={styles.premiumProfileInfoText}>
                  Member since {new Date(profile.ragman?.createdAt || profile.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </PremiumCard>

          {/* Quick Actions */}
          <PremiumCard>
            <View style={styles.premiumProfileSectionHeader}>
              <Icon name="lightning-bolt-outline" size={22} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={styles.premiumProfileSectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.premiumProfileQuickActionsGrid}>
              <TouchableOpacity
                style={styles.premiumProfileQuickAction}
                onPress={() => {
                  // Navigate to payment screen for subscription management
                  navigation.navigate('PaymentScreen', {
                    selectedPlan: {
                      id: 'premium',
                      title: 'Premium Plan',
                      price: 'PKR 500',
                      color: '#7C3AED'
                    }
                  });
                }}
              >
                <View style={[styles.premiumProfileQuickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="crown" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.premiumProfileQuickActionText}>Subscription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.premiumProfileQuickAction}
                onPress={onRefreshProfile}
              >
                <View style={[styles.premiumProfileQuickActionIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Icon name="refresh" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.premiumProfileQuickActionText}>Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.premiumProfileQuickAction}
                onPress={() => Alert.alert('Help & Support', 'For premium support, contact premium@scrapify.com or call our dedicated hotline.')}
              >
                <View style={[styles.premiumProfileQuickActionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Icon name="help-circle-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.premiumProfileQuickActionText}>Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.premiumProfileQuickAction}
                onPress={handleLogout}
              >
                <View style={[styles.premiumProfileQuickActionIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Icon name="logout" size={24} color="#EF4444" />
                </View>
                <Text style={styles.premiumProfileQuickActionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </PremiumCard>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

// -----------------------------
// Main Premium Portal
// -----------------------------
const RagmanPremium = ({ navigation }) => {
  const [currentTab, setCurrentTab] = useState('requests');
  const [profile, setProfile] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todayStats, setTodayStats] = useState({ accepted: 0 });

  const nav = useMemo(() => [
    { id: 'requests', label: 'Requests', icon: 'package-variant' },
    { id: 'accepted', label: 'Accepted', icon: 'check-circle' },
    { id: 'rates', label: 'Rates', icon: 'cash' },
    { id: 'profile', label: 'Profile', icon: 'account' },
  ], []);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, pendingData, acceptedData, ratesData] = await Promise.all([
        fetchRagmanProfile(),
        fetchPendingRequests(),
        fetchMyAcceptedRequests(),
        fetchLatestRates()
      ]);

      console.log('=== API Response Debug ===');
      console.log('Profile Data:', JSON.stringify(profileData, null, 2));
      console.log('Pending Data:', JSON.stringify(pendingData, null, 2));
      console.log('Accepted Data:', JSON.stringify(acceptedData, null, 2));
      console.log('Rates Data:', JSON.stringify(ratesData, null, 2));
      console.log('=========================');

      // Handle profile data - FIXED
      const profileUser = profileData.user || profileData.data?.user || profileData;
      setProfile(profileUser);

      // Handle pending requests - based on actual API structure
      const pendingRequestsArray = pendingData.requests || pendingData.data?.requests || pendingData || [];
      const processedPendingRequests = pendingRequestsArray
        .filter(req => req.status === 'PENDING' && !req.assignedRagmanId)
        .map(req => ({
          ...req,
          timeAgo: formatTimeAgo(req.createdAt),
        }));
      setPendingRequests(processedPendingRequests);

      // Handle accepted requests - based on actual API structure
      const acceptedRequestsArray = acceptedData.requests || acceptedData.data?.requests || acceptedData || [];

      console.log('📦 Processing Accepted Requests:');
      console.log('='.repeat(60));
      console.log('Raw accepted requests array:', JSON.stringify(acceptedRequestsArray, null, 2));
      console.log('-'.repeat(60));

      const processedAcceptedRequests = acceptedRequestsArray.map((req, index) => {
        // IMPORTANT: Normalize status for rider assignment
        // Backend may return "ACCEPTED" but we need "ASSIGNED" for rider assignment
        const normalizedStatus = req.status === 'ACCEPTED' ? 'ASSIGNED' : req.status;

        console.log(`Request ${index + 1}:`, {
          id: req.id,
          idExists: !!req.id,
          idType: typeof req.id,
          originalStatus: req.status,
          normalizedStatus: normalizedStatus,
          statusChanged: req.status !== normalizedStatus,
          customerName: req.customer?.name || req.users?.name,
        });

        return {
          ...req,
          // Override status to ASSIGNED if it's ACCEPTED
          status: normalizedStatus,
        };
      });

      console.log('Total accepted requests:', processedAcceptedRequests.length);
      console.log('='.repeat(60));

      setAcceptedRequests(processedAcceptedRequests);

      // Handle rates data - FIXED to handle object format
      const ratesArray = convertRatesToArray(ratesData);
      console.log('Converted rates array:', ratesArray);
      setRates(ratesArray);
      
      // Calculate today's stats
      const today = new Date().toDateString();
      const acceptedToday = processedAcceptedRequests.filter(r => 
        new Date(r.acceptedAt || r.updatedAt || r.createdAt).toDateString() === today
      ).length;
      
      setTodayStats({
        accepted: acceptedToday
      });
      
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);


// Replace your complex status mapping with this simpler approach
const handleAcceptRequest = async (request) => {
  try {
    const result = await acceptRequest(request.id);
    
    if (result.success) {
      // Don't override the status - use what the backend returns
      const updatedRequest = {
        ...request,
        ...result.request, // Let backend data take precedence
        acceptedAt: new Date().toISOString(),
      };
      
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      setAcceptedRequests(prev => [... prev, updatedRequest]);
    }
  } catch (error) {
    console.error('Accept request error:', error);
    throw error;
  }
};




  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('@jwt_token');
      navigation.reset({ index: 0, routes: [{ name: 'RagmanLogin' }] });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'requests': return 'Live Requests';
      case 'accepted': return 'Accepted Requests';
      case 'rates': return 'Market Rates';
      case 'profile': return 'Premium Profile';
      default: return 'Premium Portal';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <RNStatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      
      <View style={styles.premiumHeaderWrap}>
        <HeaderBar
          title={getTabTitle()}
          subtitle={`Premium Account${profile?.name ? ` • ${profile.name}` : ''}`}
          rightIcon="account"
          onRightPress={() => setCurrentTab('profile')}
        />
      </View>

      {/* Premium Stats Header - Only show on requests tab */}
      {currentTab === 'requests' && (
        <View style={styles.premiumStatsWrap}>
          <PremiumCard>
            <View style={styles.premiumStatsHeader}>
              <Icon name="crown" size={24} color="#F59E0B" />
              <Text style={styles.premiumStatsTitle}>Today's Performance</Text>
              <Icon name="trending-up" size={20} color="#10B981" />
            </View>
            <View style={styles.statsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigPurple}>{todayStats.accepted}</Text>
                <Text style={styles.smallMuted}>Requests Accepted Today</Text>
              </View>
            </View>
          </PremiumCard>
        </View>
      )}

      <View style={styles.container}>
        {currentTab === 'requests' && (
          <PremiumRequestsScreen
            pendingRequests={pendingRequests}
            onAcceptRequest={handleAcceptRequest}
            loading={loading}
            onRefresh={loadInitialData}
          />
        )}
        {currentTab === 'accepted' && (
          <AcceptedRequestsScreen
            acceptedRequests={acceptedRequests}
            loading={loading}
            onRefresh={loadInitialData}
            navigation={navigation}
            onRiderAssigned={(assignment) => {
              // Refresh accepted requests to show updated status
              loadInitialData();

              // Only show success alert if assignment is valid
              if (assignment && assignment.rider) {
                Alert.alert(
                  'Rider Assigned',
                  `Rider ${assignment.rider.name || 'assigned'} will handle this pickup and will contact the customer soon.`
                );
              }
            }}
          />
        )}
        {currentTab === 'rates' && (
          <RatesScreen
            rates={rates}
            loading={loading}
            onRefresh={loadInitialData}
          />
        )}
        {currentTab === 'profile' && (
          <ProfileScreen
            profile={profile}
            onRefresh={loadInitialData}
            navigation={navigation}
            onLogout={handleLogout}
          />
        )}
      </View>

      {/* Premium Bottom Navigation */}
      <View style={styles.premiumBottomBar}>
        <View style={styles.bottomRow}>
          {nav.map(item => {
            const active = currentTab === item.id;
            const badgeCount = item.id === 'accepted' ? acceptedRequests.length : 0;
            
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.bottomBtn}
                onPress={() => setCurrentTab(item.id)}
                activeOpacity={0.9}
              >
                <View style={{ position: 'relative' }}>
                  <Icon name={item.icon} size={22} color={active ? '#7C3AED' : '#6B7280'} />
                  {badgeCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.badgeCount}>{badgeCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.bottomLabel, active ? { color: '#7C3AED' } : null]}>
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
// Styles
// -----------------------------
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  premiumHeaderWrap: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  premiumStatsWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    color: '#DDD6FE',
    fontSize: 12,
    marginTop: 2,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  screenPad: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  premiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  // Premium Stats
  premiumStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumStatsTitle: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bigPurple: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 24,
  },
  bigGreen: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 20,
  },
  smallMuted: {
    color: '#6B7280',
    fontSize: 12,
  },
  mediumBold: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 18,
  },

  // Real-time indicator
  realTimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  realTimeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },

  // Request items
  reqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reqName: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  customerRating: {
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 2,
  },
  reqDetails: {
    gap: 6,
    marginBottom: 12,
  },
  premiumActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  chatActionBtn: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dispatchActionBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dispatchBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  premiumFeatureText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
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
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  successBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
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

  // Rates
  ratesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rateCard: {
    padding: 16,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rateMaterial: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  rateValue: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 18,
  },
  rateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateDate: {
    color: '#6B7280',
    fontSize: 12,
  },
  rateTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Profile
  avatarCircleLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  sectionTitle: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  mutedText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },

  // Verification
  verificationList: {
    marginTop: 10,
    gap: 12,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verificationText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  verificationStatus: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Premium features
  featureList: {
    marginTop: 10,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },

  // Monthly stats
  monthlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 18,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },

  // Rider Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 16,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  requestInfoCard: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  riderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F8FAFF',
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderName: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  riderRating: {
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 4,
  },
  riderDistance: {
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 4,
  },
  riderPhone: {
    color: '#7C3AED',
    fontSize: 11,
    marginTop: 2,
  },

  // Bottom Navigation
  premiumBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  bottomRow: {
    flexDirection: 'row',
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bottomLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#6B7280',
    fontWeight: '700',
  },

  // Premium Professional Profile Screen Styles
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
  premiumProfileHeroSection: {
    backgroundColor: '#7C3AED',
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  premiumProfileAvatarLarge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    borderWidth: 4,
    borderColor: '#8B5CF6',
  },
  premiumProfileHeroName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  premiumProfileHeroSubtitle: {
    fontSize: 14,
    color: '#DDD6FE',
    marginBottom: 10,
  },
  premiumProfileHeroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
  },
  premiumProfileHeroRatingText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 4,
  },
  premiumProfileHeroRatingCount: {
    fontSize: 12,
    color: '#DDD6FE',
  },
  premiumProfileStatsContainer: {
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 12,
  },
  premiumProfileStatCardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  premiumProfileStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  premiumProfileStatIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  premiumProfileStatValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  premiumProfileStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  premiumProfileContentPad: {
    paddingHorizontal: 16,
  },
  premiumBenefitsBanner: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  premiumBenefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumBenefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    flex: 1,
  },
  premiumProfileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumProfileSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  premiumProfileVerificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  premiumProfileVerificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumProfileVerificationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  premiumProfileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 10,
  },
  premiumProfileInfoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  premiumProfileQuickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },
  premiumProfileQuickAction: {
    width: (width - 32 - 42) / 4,
    alignItems: 'center',
  },
  premiumProfileQuickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  premiumProfileQuickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  // Modal Detail Styles
  secondaryBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  premiumItemDetailCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  itemDetailName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  itemDetailInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemDetailRate: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '600',
  },
  itemDetailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  textInputField: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
});

export default RagmanPremium;