// src/screen/Rider/RiderHistoryScreen.jsx
// Rider History Screen - View completed and cancelled assignments

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RIDER_GET_HISTORY_API } from '../../config';

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

const RiderHistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, COMPLETED, CANCELLED

  // Load history
  const loadHistory = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await makeAuthenticatedRequest(RIDER_GET_HISTORY_API);
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);

      // Handle rider profile not found error
      if (error.message && error.message.includes('Rider profile not found')) {
        Alert.alert(
          'Profile Incomplete',
          'Please complete your rider profile (phone, license number, and vehicle details) before viewing history.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Complete Profile',
              onPress: () => navigation.navigate('RiderProfile')
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load history: ' + error.message);
      }
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory(false);
  }, [loadHistory]);

  // Filter history
  const filteredHistory = history.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  // Calculate stats
  const stats = {
    total: history.length,
    completed: history.filter((h) => h.status === 'COMPLETED').length,
    cancelled: history.filter((h) => h.status === 'CANCELLED').length,
    totalPoints: history
      .filter((h) => h.status === 'COMPLETED')
      .reduce((sum, h) => sum + (h.pickup?.totalPoints || 0), 0),
  };

  // History Card Component
  const HistoryCard = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const isCompleted = item.status === 'COMPLETED';

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
            <Text style={styles.timeText}>
              {item.completedAt ? formatTimeAgo(item.completedAt) : 'Recently'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.pickup?.location || 'Location not specified'}
            </Text>
          </View>

          {isCompleted && (
            <>
              <View style={styles.detailRow}>
                <Icon name="weight-kilogram" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{item.pickup?.totalWeight || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="package-variant" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{item.pickup?.itemCount || 0} items</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="star" size={16} color="#F59E0B" />
                <Text style={[styles.detailText, { fontWeight: '600', color: '#7C3AED' }]}>
                  {item.pickup?.totalPoints || 0} points earned
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Timeline */}
        {item.pickupStartedAt && (
          <View style={styles.timelineSection}>
            <View style={styles.timelineItem}>
              <Icon name="clock-outline" size={14} color="#9CA3AF" />
              <Text style={styles.timelineText}>
                Started: {new Date(item.pickupStartedAt).toLocaleTimeString()}
              </Text>
            </View>
            {item.completedAt && (
              <View style={styles.timelineItem}>
                <Icon name="check-circle-outline" size={14} color="#9CA3AF" />
                <Text style={styles.timelineText}>
                  Completed: {new Date(item.completedAt).toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#9921E8" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pickup History</Text>
        <Text style={styles.headerSubtitle}>View your completed pickups</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalPoints}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.cancelled}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
            All ({history.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'COMPLETED' && styles.filterTabActive]}
          onPress={() => setFilter('COMPLETED')}
        >
          <Text style={[styles.filterText, filter === 'COMPLETED' && styles.filterTextActive]}>
            Completed ({stats.completed})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'CANCELLED' && styles.filterTabActive]}
          onPress={() => setFilter('CANCELLED')}
        >
          <Text style={[styles.filterText, filter === 'CANCELLED' && styles.filterTextActive]}>
            Cancelled ({stats.cancelled})
          </Text>
        </TouchableOpacity>
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
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="history" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No History Found</Text>
            <Text style={styles.emptyText}>
              {filter === 'ALL'
                ? 'Your completed and cancelled pickups will appear here'
                : `No ${filter.toLowerCase()} pickups found`}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredHistory.map((item) => (
              <HistoryCard key={item.id} item={item} />
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9921E8',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#9921E8',
    borderColor: '#9921E8',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
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
    fontSize: 16,
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
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  timelineSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineText: {
    fontSize: 12,
    color: '#9CA3AF',
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
});

export default RiderHistoryScreen;
