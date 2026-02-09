// RiderTrackAssignScreen.jsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRACK_RIDER_API } from '../../config';

const RiderTrackAssignScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrackingData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTrackingData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [requestId]);

  const fetchTrackingData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('@jwt_token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(TRACK_RIDER_API(requestId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTrackingData(data);
      } else {
        throw new Error(data.error || 'Failed to fetch tracking data');
      }
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError(err.message);
      if (!silent) {
        Alert.alert('Error', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrackingData();
  };

  const handleCallRider = () => {
    if (trackingData?.rider?.phone) {
      const phoneNumber = trackingData.rider.phone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'ACCEPTED': return '#3b82f6';
      case 'IN_PROGRESS': return '#8b5cf6';
      case 'COMPLETED': return '#22c55e';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return 'time-outline';
      case 'ACCEPTED': return 'checkmark-circle-outline';
      case 'IN_PROGRESS': return 'bicycle-outline';
      case 'COMPLETED': return 'checkmark-done-circle';
      case 'CANCELLED': return 'close-circle-outline';
      default: return 'information-circle-outline';
    }
  };

  if (loading && !trackingData) {
    return (
      <LinearGradient colors={["#b6f492", "#338b93"]} style={styles.container}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        {Platform.OS === "android" && (
          <View style={{ height: RNStatusBar.currentHeight }} />
        )}
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Status</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading tracking information...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error && !trackingData) {
    return (
      <LinearGradient colors={["#b6f492", "#338b93"]} style={styles.container}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        {Platform.OS === "android" && (
          <View style={{ height: RNStatusBar.currentHeight }} />
        )}
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Rider</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTrackingData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#b6f492", "#338b93"]} style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {Platform.OS === "android" && (
        <View style={{ height: RNStatusBar.currentHeight }} />
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Rider</Text>
        <TouchableOpacity onPress={() => fetchTrackingData()}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Request ID Card */}
        <View style={styles.card}>
  <Text style={styles.cardLabel}>Request ID</Text>
  <Text style={styles.requestId}>
    #SCRAPIFY{requestId.slice(-8).toUpperCase()}
  </Text>
</View>

        {/* Request Information Card - DYNAMIC */}
        {trackingData?.requestInfo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Request Details</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#22c55e" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Pickup Location</Text>
                <Text style={styles.infoValue}>{trackingData.requestInfo.location}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="scale-outline" size={20} color="#22c55e" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Total Weight</Text>
                <Text style={styles.infoValue}>{trackingData.requestInfo.totalWeight}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={20} color="#22c55e" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Estimated Value</Text>
                <Text style={styles.infoValue}>PKR {trackingData.requestInfo.totalValue?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="star-outline" size={20} color="#22c55e" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Points</Text>
                <Text style={styles.infoValue}>{trackingData.requestInfo.totalPoints || 0} pts</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="list-outline" size={20} color="#22c55e" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Items</Text>
                <Text style={styles.infoValue}>{trackingData.requestInfo.itemCount || 0} items</Text>
              </View>
            </View>
          </View>
        )}

        {/* Ragman Information Card - DYNAMIC */}
        {trackingData?.ragmanInfo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Ragman</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="business" size={20} color="#22c55e" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Business Name</Text>
                <Text style={styles.infoValue}>{trackingData.ragmanInfo.businessName}</Text>
              </View>
            </View>
          </View>
        )}

        {!trackingData?.riderAssigned ? (
          // No Rider Assigned Yet
          <View style={styles.card}>
            <View style={styles.noRiderContainer}>
              <Ionicons name="person-outline" size={64} color="#f59e0b" />
              <Text style={styles.noRiderTitle}>No Rider Assigned Yet</Text>
              <Text style={styles.noRiderText}>
                Your request is {trackingData?.requestStatus?.toLowerCase() || 'pending'}. A rider will be assigned soon by the ragman.
              </Text>
              <View style={styles.statusBadge}>
                <Ionicons name="time-outline" size={16} color="#f59e0b" />
                <Text style={styles.statusBadgeText}>Waiting for Rider Assignment</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Rider Status Card */}
            <View style={styles.card}>
              <View style={styles.statusHeader}>
                <Text style={styles.cardTitle}>Current Status</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(trackingData.riderStatus)}20` }
                ]}>
                  <Ionicons
                    name={getStatusIcon(trackingData.riderStatus)}
                    size={16}
                    color={getStatusColor(trackingData.riderStatus)}
                  />
                  <Text style={[
                    styles.statusBadgeText,
                    { color: getStatusColor(trackingData.riderStatus) }
                  ]}>
                    {trackingData.riderStatus.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Rider Information Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rider Information</Text>
              
              <View style={styles.riderInfoRow}>
                <Ionicons name="person" size={20} color="#22c55e" />
                <View style={styles.riderInfoText}>
                  <Text style={styles.riderInfoLabel}>Name</Text>
                  <Text style={styles.riderInfoValue}>{trackingData.rider.name}</Text>
                </View>
              </View>

              <View style={styles.riderInfoRow}>
                <Ionicons name="call" size={20} color="#22c55e" />
                <View style={styles.riderInfoText}>
                  <Text style={styles.riderInfoLabel}>Phone</Text>
                  <Text style={styles.riderInfoValue}>{trackingData.rider.phone || 'N/A'}</Text>
                </View>
              </View>

              {trackingData.rider.vehicle && (
                <View style={styles.riderInfoRow}>
                  <Ionicons name="bicycle" size={20} color="#22c55e" />
                  <View style={styles.riderInfoText}>
                    <Text style={styles.riderInfoLabel}>Vehicle</Text>
                    <Text style={styles.riderInfoValue}>{trackingData.rider.vehicle}</Text>
                  </View>
                </View>
              )}

              {trackingData.rider.phone && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallRider}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.callButtonText}>Call Rider</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Timeline Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pickup Timeline</Text>
              
              <View style={styles.timelineContainer}>
                <View style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    trackingData.timeline.assignedAt && styles.timelineDotActive
                  ]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Rider Assigned</Text>
                    <Text style={styles.timelineTime}>
                      {formatDate(trackingData.timeline.assignedAt)}
                    </Text>
                  </View>
                  <Ionicons
                    name={trackingData.timeline.assignedAt ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={trackingData.timeline.assignedAt ? "#22c55e" : "#cbd5e1"}
                  />
                </View>

                <View style={styles.timelineLine} />

                <View style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    trackingData.timeline.pickupStartedAt && styles.timelineDotActive
                  ]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Pickup Started</Text>
                    <Text style={styles.timelineTime}>
                      {formatDate(trackingData.timeline.pickupStartedAt)}
                    </Text>
                  </View>
                  <Ionicons
                    name={trackingData.timeline.pickupStartedAt ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={trackingData.timeline.pickupStartedAt ? "#22c55e" : "#cbd5e1"}
                  />
                </View>

                <View style={styles.timelineLine} />

                <View style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    trackingData.timeline.completedAt && styles.timelineDotActive
                  ]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Completed</Text>
                    <Text style={styles.timelineTime}>
                      {formatDate(trackingData.timeline.completedAt)}
                    </Text>
                  </View>
                  <Ionicons
                    name={trackingData.timeline.completedAt ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={trackingData.timeline.completedAt ? "#22c55e" : "#cbd5e1"}
                  />
                </View>
              </View>
            </View>

            {/* Notes Card (if available) */}
            {trackingData.notes && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rider Notes</Text>
                <Text style={styles.notesText}>{trackingData.notes}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  requestId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  noRiderContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noRiderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noRiderText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  // Info Row Styles (for Request Details)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  // Rider Info Row Styles
  riderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  riderInfoText: {
    flex: 1,
  },
  riderInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  riderInfoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
    marginRight: 12,
  },
  timelineDotActive: {
    backgroundColor: '#22c55e',
  },
  timelineContent: {
    flex: 1,
    paddingVertical: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  timelineLine: {
    position: 'absolute',
    left: 13,
    top: 24,
    width: 2,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  notesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  // Info Row Styles (for Request Details and Ragman Info)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
});

export default RiderTrackAssignScreen;