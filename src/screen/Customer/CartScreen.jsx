// CartScreen.jsx - Updated with Complete Backend Integration
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar as RNStatusBar,
  Platform,
  Dimensions,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  Modal,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ADD_TRASH_API, 
  GET_USER_POINTS_API, 
  REDEEM_VOUCHER_API,
  CREATE_REQUEST_API,
  CHECK_REQUEST_STATUS_API
} from '../../../src/config';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const CartScreen = ({ route, navigation }) => {
  const { cartItems = [] } = route.params || {};

  // State
  const [currentCartItems, setCurrentCartItems] = useState(cartItems);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [showRagmanFinder, setShowRagmanFinder] = useState(false);
  const [ragmanSearchState, setRagmanSearchState] = useState('searching');
  const [selectedRagman, setSelectedRagman] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [searchTimer, setSearchTimer] = useState(30);
  const [userLocation, setUserLocation] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isRedeemingVoucher, setIsRedeemingVoucher] = useState(false);


  // Refs for cleanup
  const timerIntervalRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);

  // URL resolver for Android emulator
 // Add this to your resolveUrlForDevice function to see the actual URLs being called
const resolveUrlForDevice = (url) => {
  const resolvedUrl = Platform.OS === 'android' && /http:\/\/\d+\.\d+\.\d+\.\d+/.test(url)
    ? url.replace(/http:\/\/[\d.]+/, 'http://10.0.2.2')
    : url;
  console.log('Resolved URL:', resolvedUrl);
  return resolvedUrl;
};

  // Pulse animation
  useEffect(() => {
    if (ragmanSearchState === 'searching') {
      const startPulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]).start(startPulse);
      };
      startPulse();
    } else {
      pulseAnim.setValue(1);
    }
  }, [ragmanSearchState, pulseAnim]);

  // On mount
  useEffect(() => {
    getUserToken();
    fetchUserPoints();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    };
  }, []);

  const fetchUserPoints = async () => {
    try {
      const token = await getUserToken();
      if (!token) return;

      const response = await fetch(resolveUrlForDevice(GET_USER_POINTS_API), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setUserPoints(result.totalPoints || 0);
      } else {
        console.error('Failed to fetch points:', result.message);
      }
    } catch (error) {
      console.error('Error fetching user points:', error);
    }
  };

  const redeemVoucher = async (points) => {
    if (userPoints < points) {
      Alert.alert('Insufficient Points', `You need ${points} points to redeem this voucher. You currently have ${userPoints} points.`);
      return;
    }

    Alert.alert(
      'Redeem Voucher',
      `Redeem PKR ${points} voucher for ${points} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setIsRedeemingVoucher(true);
            try {
              const token = await getUserToken();
              if (!token) {
                handleNoToken();
                return;
              }

              const response = await fetch(resolveUrlForDevice(REDEEM_VOUCHER_API), {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ points }),
              });

              const result = await response.json();
              
              if (response.ok && result.success) {
                Alert.alert(
                  'Voucher Redeemed!',
                  `Your PKR ${result.voucher.value} voucher has been created!\n\nVoucher Code: ${result.voucher.code}\n\nExpires: ${new Date(result.voucher.expiresAt).toLocaleDateString()}`,
                  [{ text: 'OK' }]
                );
                fetchUserPoints();
              } else {
                Alert.alert('Redemption Failed', result.message || 'Failed to redeem voucher. Please try again.');
              }
            } catch (error) {
              console.error('Error redeeming voucher:', error);
              Alert.alert('Error', 'Failed to redeem voucher. Please check your connection.');
            } finally {
              setIsRedeemingVoucher(false);
            }
          }
        }
      ]
    );
  };

  // Token getter
  const getUserToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@jwt_token');
      if (token && token.trim() !== '') {
        setUserToken(token);
        return token;
      }
      setUserToken(null);
      return null;
    } catch (error) {
      console.error('Error getting user token:', error);
      setUserToken(null);
      return null;
    }
  };



  // Cart summary
  const cartSummary = currentCartItems.reduce((acc, item) => {
    // For plastic items (per piece), weight calculation is different
    const isPlastic = item.name === 'Plastic Bottle' || item.weight === 'per piece';
    const weightValue = isPlastic ? 1 : parseFloat((item.weight || '0 kg').replace(' kg', ''));

    return {
      totalItems: acc.totalItems + (item.quantity || 0),
      totalPoints: acc.totalPoints + ((item.points || 0) * (item.quantity || 0)),
      totalExpectedEarning: acc.totalExpectedEarning + (
        (item.customerRate || 0) *
        weightValue *
        (item.quantity || 0)
      ),
      uniqueItems: acc.uniqueItems + 1
    };
  }, { totalItems: 0, totalPoints: 0, totalExpectedEarning: 0, uniqueItems: 0 });

  // Quantity helpers
  const updateQuantity = (itemId, newQuantity) => {
    const numericQuantity = parseInt(newQuantity, 10) || 0;
    if (numericQuantity === 0) {
      setCurrentCartItems(prev => prev.filter(item => item.id !== itemId));
    } else if (numericQuantity <= 999) {
      setCurrentCartItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: numericQuantity } : item
        )
      );
    }
  };

  const removeItem = (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setCurrentCartItems(prev => prev.filter(item => item.id !== itemId))
        }
      ]
    );
  };

  const clearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setCurrentCartItems([]);
            setIsEditing(false);
          }
        }
      ]
    );
  };

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to create requests.');
        return null;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const locString = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      setUserLocation(locString);
      return locString;
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Failed to get your location. Please try again.');
      return null;
    }
  };

  // Create customer request - Updated to match backend API
  const createCustomerRequest = async (location) => {
    try {
      const token = await getUserToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      // Calculate total weight from all items
      const totalWeightKg = currentCartItems.reduce((total, item) => {
        // Handle plastic items (per piece) - assume 0.05 kg per piece for weight calculation
        const isPlastic = item.name === 'Plastic Bottle' || item.weight === 'per piece';
        const itemWeight = isPlastic ? 0.05 : parseFloat((item.weight || '0 kg').replace(' kg', ''));
        const weight = isNaN(itemWeight) ? 0 : itemWeight;
        return total + (weight * (item.quantity || 1));
      }, 0);

      const requestData = {
        items: currentCartItems.map(item => ({
          category: item.name || item.category,
          weight: item.weight || "0 kg",
          points: (item.points || 0),
          customerRate: item.customerRate || 0,
          quantity: item.quantity || 1,
          imageUrl: item.image || ""
        })),
        location: location,
        totalWeight: `${totalWeightKg.toFixed(2)} kg`,
        totalPoints: cartSummary.totalPoints,
        totalValue: cartSummary.totalExpectedEarning
      };

      console.log('Creating customer request:', JSON.stringify(requestData, null, 2));

      const response = await fetch(resolveUrlForDevice(CREATE_REQUEST_API), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      console.log('Customer request response:', result);

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create request');
      }

      if (result.success && result.request) {
        console.log('Customer request created successfully:', result.request.id);
        return result.request.id;
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('Error creating customer request:', error);
      throw error;
    }
  };

  // Check request status periodically
 // Replace your existing checkRequestStatus function with this improved version

const checkRequestStatus = async () => {
  if (!requestId) {
    console.log('No requestId available for status check');
    return;
  }

  try {
    const token = await getUserToken();
    if (!token) {
      console.log('No token available for status check');
      return;
    }

    const url = resolveUrlForDevice(`${CHECK_REQUEST_STATUS_API}/${requestId}`);
    console.log('Checking request status at:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status check response status:', response.status);

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Status check response is not JSON, content-type:', contentType);
      const textResponse = await response.text();
      console.error('Non-JSON response body (first 500 chars):', textResponse.substring(0, 500));
      return;
    }

    const result = await response.json();
    console.log('Request status check result:', result);
    
    if (response.ok && result.success) {
      if (result.status === 'ASSIGNED' && result.assignedRagman) {
        // Request was accepted by a ragman
        const ragmanInfo = result.assignedRagman;
        setSelectedRagman({
          id: ragmanInfo.id,
          name: ragmanInfo.businessName || 'Ragman',
          phone: ragmanInfo.phone || 'Not available',
          userId: ragmanInfo.userId,
          subscriptionPlan: ragmanInfo.subscriptionPlan || 'Free Plan'
        });
        setRagmanSearchState('accepted');
        console.log('Request was accepted by ragman:', ragmanInfo.businessName);
        
        // Stop checking status
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current);
        }
      } else if (result.status === 'PENDING') {
        // Still waiting, continue checking
        console.log('Request still pending, continuing to check...');
      } else {
        console.log('Request has status:', result.status);
      }
    } else {
      console.error('Status check failed:', result.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error checking request status:', error);
    console.error('Status check error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500)
    });
  }
};

  // Start checking request status every 5 seconds
  const startStatusChecking = () => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
    }
    
    statusCheckIntervalRef.current = setInterval(() => {
      checkRequestStatus();
    }, 5000);
  };

  // Timer effect with timeout handling
  useEffect(() => {
  if (ragmanSearchState === 'searching' && searchTimer > 0) {
    timerIntervalRef.current = setInterval(() => {
      setSearchTimer(prev => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          // Instead of immediately calling handleSearchTimeout, 
          // set a small delay to prevent race conditions
          setTimeout(handleSearchTimeout, 100);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
  }
  
  return () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };
}, [ragmanSearchState, searchTimer]);
  // Handle timeout
  // Replace your existing handleSearchTimeout function with this improved version

const handleSearchTimeout = async () => {
  console.log('Search timeout - checking one more time');
  
  try {
    const token = await getUserToken();
    if (!token || !requestId) {
      console.log('No token or requestId available, setting timeout state');
      setRagmanSearchState('timeout');
      return;
    }

    const url = resolveUrlForDevice(`${CHECK_REQUEST_STATUS_API}/${requestId}`);
    console.log('Making final timeout check to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Final timeout check response status:', response.status);
    console.log('Final timeout check response headers:', response.headers);

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Response is not JSON, content-type:', contentType);
      const textResponse = await response.text();
      console.error('Non-JSON response body:', textResponse.substring(0, 500));
      setRagmanSearchState('timeout');
      return;
    }

    const result = await response.json();
    console.log('Final timeout check result:', result);
    
    if (response.ok && result.success && result.status === 'ASSIGNED' && result.assignedRagman) {
      // Last-minute acceptance found
      const ragmanInfo = result.assignedRagman;
      setSelectedRagman({
        id: ragmanInfo.id,
        name: ragmanInfo.businessName || 'Ragman',
        phone: ragmanInfo.phone || 'Not available',
        userId: ragmanInfo.userId,
        subscriptionPlan: ragmanInfo.subscriptionPlan || 'Free Plan'
      });
      setRagmanSearchState('accepted');
      console.log('Last-minute acceptance found!');
    } else {
      // No acceptance found, show timeout
      console.log('No acceptance found in final check, showing timeout');
      setRagmanSearchState('timeout');
    }
  } catch (error) {
    console.error('Error in final timeout check:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Always set timeout state on error
    setRagmanSearchState('timeout');
  }
  
  if (statusCheckIntervalRef.current) {
    clearInterval(statusCheckIntervalRef.current);
  }
};
  // Submit individual trash items for points (kept from original)
  const submitTrashItem = async (item, quantity, locationArg) => {
    try {
      const formData = new FormData();

      const category = item.name || item.category || 'Unknown';
      const weight = (item.weight ?? '').toString();
      const points = ((item.points || 0) * (quantity || 1)).toString();

      formData.append('category', category);
      formData.append('location', locationArg || 'Unknown');
      if (weight) formData.append('weight', weight);
      formData.append('points', points);
      if (item.customerRate) {
        formData.append('customerRate', item.customerRate.toString());
      }

      if (item.image && typeof item.image === 'string') {
        formData.append('image', {
          uri: item.image,
          type: 'image/jpeg',
          name: `trash_${Date.now()}.jpg`,
        });
      }

      const response = await fetch(resolveUrlForDevice(ADD_TRASH_API), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.detail || 'Failed to submit trash item');
      }
      return result;
    } catch (error) {
      console.error('Error submitting trash item:', error);
      throw error;
    }
  };

  // Submit all trash items for points first
  const submitAllTrashItems = async (locationArg) => {
    if (!userToken) {
      Alert.alert('Error', 'Please login first to submit trash items.');
      return false;
    }
    if (!locationArg) {
      Alert.alert('Location Required', 'Unable to get your location. Please try again.');
      return false;
    }

    const results = [];
    let hasErrors = false;

    try {
      for (const item of currentCartItems) {
        const qty = Number(item.quantity || 0);
        if (qty <= 0) continue;

        try {
          // Submit the item once with its actual quantity
          const result = await submitTrashItem(item, qty, locationArg);
          results.push(result);
        } catch (error) {
          console.error(`Error submitting ${item.name || item.category}:`, error);
          hasErrors = true;
        }
      }

      if (hasErrors && results.length === 0) {
        Alert.alert('Error', 'Failed to submit any items. Please check your connection and try again.');
        return false;
      } else if (hasErrors) {
        Alert.alert('Partial Success', `Some items were submitted successfully (${results.length}), but there were errors with others.`);
      }
      return results.length > 0;
    } catch (error) {
      console.error('Error during batch submission:', error);
      Alert.alert('Error', 'Failed to submit trash items. Please try again.');
      return false;
    }
  };

  const handleNoToken = () => {
    Alert.alert(
      'Authentication Required',
      'Your session has expired or you need to log in to submit requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Login', onPress: () => navigation.navigate('LoginScreen') }
      ]
    );
  };

  // Main function to submit trash items AND create request
  const proceedToFindRagman = async () => {
    if (currentCartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add some items to your cart first.');
      return;
    }
    
    const token = await getUserToken();
    if (!token) {
      handleNoToken();
      return;
    }

    const location = await fetchUserLocation();
    if (!location) return;

    setIsSubmitting(true);
    
    try {
      // Step 1: Submit individual trash items for points (original functionality)
      console.log('Step 1: Submitting trash items for points...');
      const trashSubmissionSuccess = await submitAllTrashItems(location);
      
      if (!trashSubmissionSuccess) {
        setIsSubmitting(false);
        return;
      }

      // Step 2: Create the customer request for ragman matching
      console.log('Step 2: Creating customer request...');
      const createdRequestId = await createCustomerRequest(location);
      
      if (createdRequestId) {
        setRequestId(createdRequestId);
        setShowRagmanFinder(true);
        setRagmanSearchState('searching');
        setSearchTimer(30);
        
        // Start checking for ragman acceptance
        startStatusChecking();
        
        // Update points after successful submission
        fetchUserPoints();
      } else {
        Alert.alert('Error', 'Failed to create ragman request. Your items were saved but you may need to find a ragman manually.');
      }
    } catch (error) {
      console.error('Error in proceedToFindRagman:', error);
      Alert.alert('Error', 'Failed to process your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeRagmanFinder = () => {
    // Clear intervals
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    
    setShowRagmanFinder(false);
    setRagmanSearchState('searching');
    setSelectedRagman(null);
    setRequestId(null);
    setCurrentCartItems([]);
    navigation.navigate('AddTrashScreen', { cartItems: [] });
  };

  const renderCartItem = ({ item, index }) => {
    const isPlastic = item.name === 'Plastic Bottle' || item.weight === 'per piece';
    const weightValue = isPlastic ? 1 : parseFloat((item.weight || '0 kg').replace(' kg', ''));
    const rateLabel = isPlastic ? 'per piece' : 'per kg';

    return (
      <View style={[styles.cartItem, isEditing && styles.cartItemEditing]}>
        <Image source={item.image} style={styles.itemImage} />

        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {isEditing && (
              <TouchableOpacity
                style={styles.removeButtonInline}
                onPress={() => removeItem(item.id)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.itemWeight}>{item.weight} • {item.points} pts each</Text>
          <View style={styles.rateRow}>
            <View style={styles.rateBadge}>
              <Ionicons name="cash-outline" size={14} color="#6366f1" />
              <Text style={styles.itemCustomerRate}>PKR {item.customerRate || 0}/{rateLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.itemActions}>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabelTop}>Qty</Text>
            {isEditing ? (
              <View style={styles.quantityEditContainer}>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.id, Math.max(0, item.quantity - 1).toString())}
                  style={styles.quantityBtn}
                >
                  <Ionicons name="remove" size={16} color="#475569" />
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateQuantity(item.id, text)}
                  keyboardType="numeric"
                  maxLength={3}
                  selectTextOnFocus={true}
                />
                <TouchableOpacity
                  onPress={() => updateQuantity(item.id, (item.quantity + 1).toString())}
                  style={styles.quantityBtn}
                >
                  <Ionicons name="add" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <Text style={styles.quantityUnit}>pcs</Text>
              </View>
            )}
          </View>

          <View style={styles.itemTotals}>
            <View style={styles.totalPointsRow}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.itemTotalPoints}>{item.points * item.quantity}</Text>
            </View>
            <Text style={styles.itemExpectedEarning}>
              PKR {((item.customerRate || 0) * weightValue * item.quantity).toFixed(0)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyCartContainer}>
      <Ionicons name="cart-outline" size={80} color="#cbd5e1" />
      <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
      <Text style={styles.emptyCartSubtitle}>Start adding trash items to earn points and money!</Text>
      <TouchableOpacity 
        style={styles.startShoppingButton}
        onPress={() => navigation.navigate('AddTrashScreen', { cartItems: currentCartItems })}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.startShoppingText}>Add Trash Items</Text>
      </TouchableOpacity>
    </View>
  );

  // Ragman Finder Modal Content
  const renderRagmanFinderContent = () => {
    switch (ragmanSearchState) {
      case 'searching':
        return (
          <View style={styles.searchingContainer}>
            <Animated.View style={[styles.searchingIcon, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="search" size={60} color="#166534" />
            </Animated.View>
            <Text style={styles.searchingTitle}>Finding Ragmen Near You</Text>
            <Text style={styles.searchingSubtitle}>
              We're searching for available ragmen in your area...
            </Text>
            <View style={styles.searchingTimer}>
              <Text style={styles.timerText}>{searchTimer}s</Text>
            </View>
            <View style={styles.searchingStats}>
              <Text style={styles.statsText}>📦 {cartSummary.totalItems} items</Text>
              <Text style={styles.statsText}>⭐ {cartSummary.totalPoints} points</Text>
              <Text style={styles.statsText}>💰 PKR {cartSummary.totalExpectedEarning.toFixed(2)} expected</Text>
            </View>
            <View style={styles.requestInfo}>
              <Text style={styles.requestIdText}>Request ID: {requestId}</Text>
            </View>
          </View>
        );

      case 'timeout':
        return (
          <View style={styles.timeoutContainer}>
            <View style={styles.timeoutHeader}>
              <Ionicons name="time-outline" size={40} color="#f59e0b" />
              <Text style={styles.timeoutTitle}>Request Posted Successfully</Text>
              <Text style={styles.timeoutSubtitle}>
                Your request is now visible to all ragmen. They can accept it and will contact you.
              </Text>
            </View>
            
            <View style={styles.timeoutInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.infoText}>Request successfully created</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="eye" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>Visible to all verified ragmen</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="notifications" size={20} color="#8b5cf6" />
                <Text style={styles.infoText}>You'll be contacted when accepted</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="star" size={20} color="#f59e0b" />
                <Text style={styles.infoText}>Points already added to your account</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.checkStatusButton}
              onPress={() => {
                setRagmanSearchState('searching');
                setSearchTimer(15);
                startStatusChecking();
              }}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.checkStatusText}>Check Status Again</Text>
            </TouchableOpacity>
          </View>
        );

      case 'accepted':
  return (
    <View style={styles.acceptedContainer}>
      <View style={styles.acceptedHeader}>
        <Ionicons name="checkmark-circle" size={60} color="#10b981" />
        <Text style={styles.acceptedTitle}>Request Accepted!</Text>
        <Text style={styles.acceptedSubtitle}>
          {selectedRagman?.name} will collect your trash
        </Text>
      </View>
      
      <View style={styles.ragmanSelectedCard}>
        <View style={styles.selectedRagmanAvatar}>
          <Ionicons name="person" size={40} color="#166534" />
        </View>
        <View style={styles.selectedRagmanInfo}>
          <Text style={styles.selectedRagmanName}>{selectedRagman?.name}</Text>
          <Text style={styles.selectedRagmanPlan}>{selectedRagman?.subscriptionPlan}</Text>
          <View style={styles.selectedRagmanDetails}>
            <Text style={styles.selectedDetailText}>📞 {selectedRagman?.phone}</Text>
            <Text style={styles.selectedDetailText}>🔋 Request ID: {requestId}</Text>
          </View>
        </View>
      </View>

      <View style={styles.trackingInfo}>
        <Text style={styles.trackingTitle}>Next Steps</Text>
        <View style={styles.trackingStatus}>
          <View style={styles.statusStep}>
            <View style={[styles.statusDot, styles.statusDotActive]} />
            <Text style={styles.statusText}>Request Accepted</Text>
          </View>
          <View style={styles.statusStep}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Ragman will contact you</Text>
          </View>
          <View style={styles.statusStep}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Collection scheduled</Text>
          </View>
          <View style={styles.statusStep}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Collection completed</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtonsContainer}>
  <TouchableOpacity
    style={styles.contactInfoButton}
    onPress={() => {
      Alert.alert(
        'Contact Information',
        `The ragman ${selectedRagman?.name} will contact you directly using the phone number associated with your account to arrange the collection.\n\nIf you need to contact them, their number is: ${selectedRagman?.phone}`,
        [{ text: 'Got it!' }]
      );
    }}
  >
    <Ionicons name="information-circle" size={20} color="#3b82f6" />
    <Text style={styles.contactInfoButtonText}>Contact Info</Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={styles.chatButton}
    onPress={() => {
      navigation.navigate('ChatScreen', {
        ragman: selectedRagman,
        requestId: requestId
      });
    }}
  >
    <Ionicons name="chatbubble-outline" size={20} color="#fff" />
    <Text style={styles.chatButtonText}>Start Chat</Text>
  </TouchableOpacity>
</View>
    </View>
  );
      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={["#98ce76", "#166534"]}
      style={styles.gradientBackground}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      {Platform.OS === "android" && (
        <View style={{ height: RNStatusBar.currentHeight }} />
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={styles.headerActions}>
          {currentCartItems.length > 0 && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons 
                name={isEditing ? "checkmark" : "create-outline"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Cart Summary Header */}
        {currentCartItems.length > 0 && (
          <View style={styles.cartSummaryHeader}>
            <View style={styles.summaryRow}>
              <Ionicons name="cube-outline" size={20} color="#166534" />
              <Text style={styles.summaryText}>
                {cartSummary.uniqueItems} items • {cartSummary.totalItems} pieces
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
              <Text style={styles.summaryText}>{cartSummary.totalPoints} points • PKR {cartSummary.totalExpectedEarning.toFixed(2)} expected</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="wallet-outline" size={20} color="#8b5cf6" />
              <Text style={styles.summaryText}>Available: {userPoints} points</Text>
            </View>
          </View>
        )}

        {/* Cart Items List */}
        {currentCartItems.length > 0 ? (
          <FlatList
            data={currentCartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.cartList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <ScrollView style={styles.cartList} contentContainerStyle={styles.emptyCartScrollContent}>
            {renderEmptyCart()}
          </ScrollView>
        )}

        {/* Points Rewards Section */}
        {currentCartItems.length > 0 && (
          <View style={styles.rewardsSection}>
            <View style={styles.rewardsHeader}>
              <Ionicons name="gift-outline" size={20} color="#166534" />
              <Text style={styles.rewardsTitle}>Points Rewards Available</Text>
              <Text style={styles.rewardsSubtitle}>You have {userPoints} points</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rewardsScroll}>
              {[
                { points: 500, value: 50 },
                { points: 1000, value: 100 },
                { points: 2500, value: 250 },
                { points: 5000, value: 500 }
              ].map((reward) => (
                <TouchableOpacity
                  key={reward.points}
                  style={[
                    styles.rewardCard,
                    userPoints < reward.points && styles.rewardCardDisabled,
                    isRedeemingVoucher && styles.rewardCardDisabled
                  ]}
                  onPress={() => redeemVoucher(reward.points)}
                  disabled={userPoints < reward.points || isRedeemingVoucher}
                >
                  {isRedeemingVoucher ? (
                    <ActivityIndicator size="small" color="#166534" />
                  ) : (
                    <>
                      <Text style={[
                        styles.rewardPoints,
                        userPoints < reward.points && styles.rewardPointsDisabled
                      ]}>
                        {reward.points} pts
                      </Text>
                      <Text style={[
                        styles.rewardValue,
                        userPoints < reward.points && styles.rewardValueDisabled
                      ]}>
                        PKR {reward.value}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Actions */}
        {currentCartItems.length > 0 && (
          <View style={styles.bottomSection}>
            {/* Total Summary */}
            <View style={styles.totalSummaryCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Items:</Text>
                <Text style={styles.totalValue}>{cartSummary.totalItems} pieces</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Points:</Text>
                <Text style={styles.totalPoints}>{cartSummary.totalPoints} pts</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Expected Earning:</Text>
                <Text style={styles.grandTotalAmount}>PKR {cartSummary.totalExpectedEarning.toFixed(2)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.addMoreButton}
                onPress={() => navigation.navigate('AddTrashScreen', { cartItems: currentCartItems })}
                disabled={isSubmitting}
              >
                <Ionicons name="add-outline" size={20} color="#166534" />
                <Text style={styles.addMoreText}>Add More</Text>
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity 
                  style={styles.clearCartButton}
                  onPress={clearCart}
                  disabled={isSubmitting}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text style={styles.clearCartText}>Clear All</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[
                  styles.findRagmanButton, 
                  isEditing && styles.findRagmanButtonSmall,
                  isSubmitting && styles.findRagmanButtonDisabled
                ]}
                onPress={proceedToFindRagman}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search-outline" size={20} color="#fff" />
                )}
                <Text style={styles.findRagmanText}>
                  {isSubmitting ? 'Creating Request...' : 'Find Ragman'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Ragman Finder Modal */}
      <Modal
        visible={showRagmanFinder}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (ragmanSearchState !== 'searching') {
            closeRagmanFinder();
          }
        }}
      >
        <LinearGradient
          colors={["#98ce76", "#166534"]}
          style={styles.modalGradient}
        >
          <StatusBar style="light" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                if (ragmanSearchState !== 'searching') {
                  closeRagmanFinder();
                }
              }}
              disabled={ragmanSearchState === 'searching'}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={ragmanSearchState === 'searching' ? '#666' : '#fff'} 
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {ragmanSearchState === 'searching' ? 'Finding Ragman' : 
               ragmanSearchState === 'timeout' ? 'Request Posted' :
               ragmanSearchState === 'accepted' ? 'Request Accepted' : 'Ragman Finder'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Modal Content */}
          <View style={styles.modalContent}>
            {renderRagmanFinderContent()}
          </View>

          {/* Modal Footer */}
          {(ragmanSearchState === 'accepted' || ragmanSearchState === 'timeout') && (
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={closeRagmanFinder}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </Modal>


      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#166534" />
            <Text style={styles.loadingText}>Creating your request...</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 10,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
  },
  cartSummaryHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cartItemEditing: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 14,
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  removeButtonInline: {
    marginLeft: 8,
    padding: 2,
  },
  itemWeight: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  itemCustomerRate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
  },
  itemActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  quantityContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityLabelTop: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quantityEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 36,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    padding: 4,
  },
  quantityDisplay: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  quantityUnit: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  itemTotals: {
    alignItems: 'center',
    gap: 6,
  },
  totalPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemTotalPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
  },
  itemExpectedEarning: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
  emptyCartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  startShoppingButton: {
    backgroundColor: '#166534',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startShoppingText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  rewardsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  rewardsSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  rewardsScroll: {
    flexDirection: 'row',
  },
  rewardCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rewardCardDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  rewardPointsDisabled: {
    color: '#9ca3af',
  },
  rewardValue: {
    fontSize: 12,
    color: '#475569',
  },
  rewardValueDisabled: {
    color: '#d1d5db',
  },
  bottomSection: {
    backgroundColor: '#fff',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalSummaryCard: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#475569',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  grandTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  addMoreButton: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  addMoreText: {
    color: '#166534',
    fontWeight: '600',
    marginLeft: 4,
  },
  clearCartButton: {
    backgroundColor: '#fef2f2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  clearCartText: {
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  findRagmanButton: {
    backgroundColor: '#166534',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 2,
    justifyContent: 'center',
  },
  findRagmanButtonSmall: {
    flex: 1,
  },
  findRagmanButtonDisabled: {
    opacity: 0.7,
  },
  findRagmanText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#475569',
  },
  
  // Ragman Finder Modal Styles
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 50,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalFooter: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 30,
  },
  doneButton: {
    backgroundColor: '#166534',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Searching State Styles
  searchingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  searchingIcon: {
    marginBottom: 24,
  },
  searchingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  searchingSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  searchingTimer: {
    backgroundColor: '#166534',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchingStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  statsText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  requestInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  requestIdText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  
  // Timeout State Styles
  timeoutContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  timeoutHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timeoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeoutSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  timeoutInfo: {
    width: '100%',
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  checkStatusButton: {
    backgroundColor: '#166534',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  checkStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  acceptedContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  acceptedHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  acceptedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
  },
  acceptedSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  ragmanSelectedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedRagmanAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selectedRagmanInfo: {
    flex: 1,
  },
  selectedRagmanName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  selectedRagmanPlan: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedRagmanDetails: {
    gap: 4,
  },
  selectedDetailText: {
    fontSize: 14,
    color: '#64748b',
  },
  trackingInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  trackingStatus: {
    gap: 12,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    color: '#64748b',
  },
  contactNote: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactNoteText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },


actionButtonsContainer: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 16,
  marginBottom: 20,
},
contactInfoButton: {
  flex: 1,
  backgroundColor: '#eff6ff',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#bfdbfe',
},
contactInfoButtonText: {
  fontSize: 15,
  color: '#3b82f6',
  marginLeft: 8,
  fontWeight: '600',
},
chatButton: {
  flex: 1,
  backgroundColor: '#166534',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 8,
},
chatButtonText: {
  fontSize: 15,
  color: '#fff',
  marginLeft: 8,
  fontWeight: '600',
},
});

export default CartScreen;