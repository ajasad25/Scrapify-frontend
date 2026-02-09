import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar as RNStatusBar,
  Platform,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GET_MY_REQUESTS_API, CHECK_REQUEST_STATUS_API } from '../../../src/config';

const MyRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    const token = await getUserToken();
    if (token) {
      fetchMyRequests();
    } else {
      setLoading(false);
      Alert.alert('Login Required', 'Please login to view your requests', [
        { text: 'OK', onPress: () => navigation.navigate('LoginScreen') }
      ]);
    }
  };

  const getUserToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@jwt_token');
      if (token && token.trim() !== '') {
        setUserToken(token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const resolveUrlForDevice = (url) => {
    return Platform.OS === 'android' && /http:\/\/\d+\.\d+\.\d+\.\d+/.test(url)
      ? url.replace(/http:\/\/[\d.]+/, 'http://10.0.2.2')
      : url;
  };

  const fetchMyRequests = async () => {
    try {
      const token = userToken || await getUserToken();
      if (!token) return;

      const response = await fetch(resolveUrlForDevice(GET_MY_REQUESTS_API), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setRequests(result.requests || []);
      } else {
        console.error('Failed to fetch requests:', result.message);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      Alert.alert('Error', 'Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkSingleRequestStatus = async (requestId) => {
    try {
      const token = userToken || await getUserToken();
      if (!token) return;

      const url = resolveUrlForDevice(`${CHECK_REQUEST_STATUS_API}/${requestId}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the specific request in state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: result.status, assignedRagman: result.assignedRagman }
            : req
        ));

        // Show status info
        if (result.status === 'ASSIGNED' && result.assignedRagman) {
          Alert.alert(
            'Request Accepted!',
            `${result.assignedRagman.businessName} has accepted your request.\n\nPhone: ${result.assignedRagman.phone || 'Not available'}`,
            [{ text: 'OK' }]
          );
        } else if (result.status === 'PENDING') {
          Alert.alert('Still Pending', 'Your request is waiting for a ragman to accept it.');
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      Alert.alert('Error', 'Failed to check request status.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyRequests();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'ASSIGNED': return '#10b981';
      case 'COMPLETED': return '#3b82f6';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return 'time-outline';
      case 'ASSIGNED': return 'checkmark-circle-outline';
      case 'COMPLETED': return 'checkmark-done-circle-outline';
      case 'CANCELLED': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };


  

  const renderRequestItem = ({ item }) => (
  <View style={styles.requestCard}>
    <View style={styles.requestHeader}>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
      <Text style={styles.timeAgo}>{item.timeAgo || 'Recently'}</Text>
    </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color="#64748b" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.location || 'Location not available'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="cube-outline" size={16} color="#8b5cf6" />
            <Text style={styles.statText}>{item.items?.length || 0} items</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star-outline" size={16} color="#f59e0b" />
            <Text style={styles.statText}>{item.totalPoints || 0} pts</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color="#10b981" />
            <Text style={styles.statText}>PKR {item.totalValue?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {item.assignedRagman && (
          <View style={styles.ragmanInfo}>
            <Ionicons name="person-circle-outline" size={20} color="#166534" />
            <View style={styles.ragmanDetails}>
              <Text style={styles.ragmanName}>{item.assignedRagman.businessName}</Text>
              {item.assignedRagman.phone && (
                <Text style={styles.ragmanPhone}>{item.assignedRagman.phone}</Text>
              )}
            </View>
          </View>
        )}
      </View>


      {item.status === 'ASSIGNED' && item.assignedRagman && (
<TouchableOpacity 
  style={styles.chatButton}
  onPress={async () => {
    const customerId = await AsyncStorage.getItem('@user_id');
    if (!customerId) {
      Alert.alert('Error', 'Could not get your user ID. Please log in again.');
      return;
    }
    navigation.navigate('ChatScreen', {
      ragman: {
        id: item.assignedRagman.id,
        name: item.assignedRagman.businessName,
        phone: item.assignedRagman.phone,
        userId: item.assignedRagman.userId,
      },
      requestId: item.id,
      customerId: customerId // <-- always pass!
    });
  }}
>
  <Ionicons name="chatbubble-outline" size={18} color="#166534" />
  <Text style={styles.chatButtonText}>Start Chat</Text>
</TouchableOpacity>
)}

{/* ADD THIS - Track Rider Button */}
{item.status === 'ASSIGNED' && (
  <TouchableOpacity 
    style={styles.trackButton}
    onPress={() => navigation.navigate('RiderTrackAssignScreen', {
      requestId: item.id
    })}
  >
    <Ionicons name="cube-outline" size={18} color="#166534" />
    <Text style={styles.trackButtonText}>Track Status</Text>
  </TouchableOpacity>
)}

{item.status === 'PENDING' && (
  <TouchableOpacity 
    style={styles.checkStatusButton}
    onPress={() => checkSingleRequestStatus(item.id)}
  >
    <Ionicons name="refresh-outline" size={18} color="#166534" />
    <Text style={styles.checkStatusText}>Check Status</Text>
  </TouchableOpacity>
)}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>No Requests Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first trash collection request from the Add Trash screen
      </Text>
      <TouchableOpacity 
        style={styles.addRequestButton}
        onPress={() => navigation.navigate('AddTrashScreen')}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addRequestText}>Add Trash Items</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#98ce76", "#166534"]} style={styles.gradientBackground}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading your requests...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#98ce76", "#166534"]} style={styles.gradientBackground}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      {Platform.OS === "android" && <View style={{ height: RNStatusBar.currentHeight }} />}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <TouchableOpacity onPress={fetchMyRequests}>
          <Ionicons name="refresh-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyListContainer : styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#166534"]} />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    color: '#94a3b8',
  },
  requestDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  ragmanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  ragmanDetails: {
    flex: 1,
  },
  ragmanName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  ragmanPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  checkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  checkStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addRequestButton: {
    backgroundColor: '#166534',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addRequestText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

chatButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f0fdf4',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginTop: 12,
  gap: 6,
  borderWidth: 1,
  borderColor: '#bbf7d0',
},
chatButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#166534',
},
trackButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#dcfce7',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginTop: 8,
  gap: 8,
},
trackButtonText: {
  color: '#166534',
  fontSize: 14,
  fontWeight: '600',
},

});

export default MyRequestsScreen;