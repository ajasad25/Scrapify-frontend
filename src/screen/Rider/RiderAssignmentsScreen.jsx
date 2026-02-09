// src/screen/Rider/RiderAssignmentsScreen.jsx
// Rider Assignments Screen - View and manage active pickups

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  RIDER_GET_ASSIGNMENTS_API,
  RIDER_UPDATE_ASSIGNMENT_STATUS_API,
  RIDER_TOGGLE_AVAILABILITY_API,
} from '../../config';

const Icon = ({ name, size = 20, color = '#4B5563', style }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);

// API Helper Function
const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('@jwt_token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const response = await fetch(url, {
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

// Helper Functions
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    'PENDING': ['ACCEPTED', 'CANCELLED'],
    'ACCEPTED': ['IN_PROGRESS', 'CANCELLED'],
    'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

const getStatusColor = (status) => {
  const colors = {
    'PENDING': '#F59E0B',
    'ACCEPTED': '#3B82F6',
    'IN_PROGRESS': '#8B5CF6',
    'COMPLETED': '#10B981',
    'CANCELLED': '#EF4444',
  };
  return colors[status] || '#6B7280';
};

const getStatusText = (status) => {
  const texts = {
    'PENDING': 'Pending',
    'ACCEPTED': 'Accepted',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
  };
  return texts[status] || status;
};

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

const RiderAssignmentsScreen = ({ navigation }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Load assignments
  const loadAssignments = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await makeAuthenticatedRequest(RIDER_GET_ASSIGNMENTS_API);
      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Failed to load assignments:', error);

      // Handle rider profile not found error
      if (error.message && error.message.includes('Rider profile not found')) {
        Alert.alert(
          'Profile Incomplete',
          'Please complete your rider profile (phone, license number, and vehicle details) before viewing assignments.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Complete Profile',
              onPress: () => navigation.navigate('RiderProfile')
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load assignments: ' + error.message);
      }
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // Handle status update
  const handleStatusUpdate = async (assignment, newStatus) => {
    // Validate transition
    if (!isValidStatusTransition(assignment.status, newStatus)) {
      Alert.alert('Invalid Action', `Cannot change status from ${assignment.status} to ${newStatus}`);
      return;
    }

    // Confirm action
    const actionText =
      newStatus === 'ACCEPTED' ? 'Accept this pickup?' :
      newStatus === 'IN_PROGRESS' ? 'Start this pickup?' :
      newStatus === 'COMPLETED' ? 'Mark as completed?' :
      newStatus === 'CANCELLED' ? 'Cancel this assignment?' :
      'Update status?';

    Alert.alert(
      'Confirm Action',
      actionText,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingStatus(assignment.id);
            try {
              const data = await makeAuthenticatedRequest(RIDER_UPDATE_ASSIGNMENT_STATUS_API, {
                method: 'PATCH',
                body: JSON.stringify({
                  assignmentId: assignment.id,
                  status: newStatus,
                }),
              });
              if (data.success) {
                Alert.alert('Success', 'Status updated successfully!');
                loadAssignments(false);
              }
            } catch (error) {
              console.error('Failed to update status:', error);
              Alert.alert('Error', error.message || 'Failed to update status');
            } finally {
              setUpdatingStatus(null);
            }
          },
        },
      ]
    );
  };

  // Handle availability toggle
  const handleToggleAvailability = async (value) => {
    setTogglingAvailability(true);
    try {
      const data = await makeAuthenticatedRequest(RIDER_TOGGLE_AVAILABILITY_API, {
        method: 'PATCH',
        body: JSON.stringify({
          isAvailable: value,
        }),
      });
      if (data.success) {
        setIsAvailable(value);
        Alert.alert(
          'Availability Updated',
          value ? 'You are now online and will receive new assignments' : 'You are now offline'
        );
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
      Alert.alert('Error', error.message || 'Failed to update availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  // Call customer
  const callCustomer = (phone) => {
    if (phone) {
      const phoneNumber = phone.replace(/[^\d]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Phone Not Available', 'Customer phone number is not available.');
    }
  };

  useEffect(() => {
    loadAssignments();
    // Refresh every 30 seconds
    const interval = setInterval(() => loadAssignments(false), 30000);
    return () => clearInterval(interval);
  }, [loadAssignments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAssignments(false);
  }, [loadAssignments]);

  // Assignment Card Component
  const AssignmentCard = ({ assignment }) => {
    const statusColor = getStatusColor(assignment.status);
    const isUpdating = updatingStatus === assignment.id;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{assignment.customer?.name || 'Customer'}</Text>
            <Text style={styles.timeText}>{formatTimeAgo(assignment.assignedAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(assignment.status)}
            </Text>
          </View>
        </View>

        {/* Pickup Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{assignment.pickup?.location || 'Location not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="phone" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{assignment.customer?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="weight-kilogram" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{assignment.pickup?.totalWeight || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="star-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{assignment.pickup?.totalPoints || 0} points</Text>
          </View>
        </View>

        {/* Items List */}
        {assignment.pickup?.items && assignment.pickup.items.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items to collect:</Text>
            {assignment.pickup.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Icon name="package-variant" size={14} color="#9CA3AF" />
                <Text style={styles.itemText}>
                  {item.category} - {item.weight} × {item.quantity}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {assignment.status === 'PENDING' && (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, isUpdating && styles.disabledButton]}
                onPress={() => handleStatusUpdate(assignment, 'ACCEPTED')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Accept Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleStatusUpdate(assignment, 'CANCELLED')}
                disabled={isUpdating}
              >
                <Icon name="close" size={18} color="#EF4444" />
                <Text style={[styles.buttonText, { color: '#EF4444' }]}>Decline</Text>
              </TouchableOpacity>
            </>
          )}

          {assignment.status === 'ACCEPTED' && (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, isUpdating && styles.disabledButton]}
                onPress={() => handleStatusUpdate(assignment, 'IN_PROGRESS')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="truck-fast" size={18} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Start Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => callCustomer(assignment.customer?.phone)}
              >
                <Icon name="phone" size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Call</Text>
              </TouchableOpacity>
            </>
          )}

          {assignment.status === 'IN_PROGRESS' && (
            <>
              <TouchableOpacity
                style={[styles.completeButton, isUpdating && styles.disabledButton]}
                onPress={() => handleStatusUpdate(assignment, 'COMPLETED')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="check-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Complete Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => callCustomer(assignment.customer?.phone)}
              >
                <Icon name="phone" size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Call</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#9921E8" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Assignments</Text>
          <Text style={styles.headerSubtitle}>Active pickups</Text>
        </View>

        {/* Availability Toggle */}
        <View style={styles.availabilityContainer}>
          <Text style={styles.availabilityLabel}>{isAvailable ? 'Online' : 'Offline'}</Text>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            disabled={togglingAvailability}
            trackColor={{ false: '#D1D5DB', true: '#9921E8' }}
            thumbColor={isAvailable ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#9921E8" />
            <Text style={styles.loadingText}>Loading assignments...</Text>
          </View>
        ) : assignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="truck-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Active Assignments</Text>
            <Text style={styles.emptyText}>
              {isAvailable
                ? 'New assignments will appear here when ragmen assign you'
                : 'Go online to receive new assignments'}
            </Text>
            {!isAvailable && (
              <TouchableOpacity
                style={styles.goOnlineButton}
                onPress={() => handleToggleAvailability(true)}
              >
                <Text style={styles.goOnlineButtonText}>Go Online</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {assignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#9921E8',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  availabilityLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsSection: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  itemsSection: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  itemText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#9921E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  goOnlineButton: {
    backgroundColor: '#9921E8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  goOnlineButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RiderAssignmentsScreen;
