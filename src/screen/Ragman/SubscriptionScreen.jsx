import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RAGMAN_SUBSCRIBE_API } from '../../config';

// If running on Android emulator, swap LAN IP -> 10.0.2.2 (no change to your config file)
const resolveUrlForDevice = (url) => {
  if (Platform.OS === 'android' && /http:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) {
    return url.replace(/http:\/\/[\d.]+/, 'http://10.0.2.2');
  }
  return url;
};

const SubscriptionScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [userToken, setUserToken] = useState(null);

  // Get user token on component mount (your exact debug flow)
  useEffect(() => {
    const testToken = async () => {
      try {
        const jwtToken = await AsyncStorage.getItem('@jwt_token');
        const username = await AsyncStorage.getItem('@uname');
        const email = await AsyncStorage.getItem('@email');

        console.log('=== LOGIN DATA CHECK ===');
        console.log('JWT Token:', jwtToken ? jwtToken.substring(0, 30) + '...' : 'NOT FOUND');
        console.log('Username:', username || 'NOT FOUND');
        console.log('Email:', email || 'NOT FOUND');
        console.log('========================');
      } catch (error) {
        console.error('Debug error:', error);
      }
    };

    testToken();
    getUserToken();
  }, []);

  // Your robust token getter (as provided), plus setUserToken
  const getUserToken = async () => {
    try {
      console.log('🔍 Getting user token...');

      const token = await AsyncStorage.getItem('@jwt_token');
      if (token && token.trim() !== '') {
        console.log('✅ Found token:', token.substring(0, 20) + '...');
        setUserToken(token);
        return token;
      }

      const fallbackKeys = ['userToken', 'token', 'authToken', 'accessToken'];
      for (const key of fallbackKeys) {
        const fallbackToken = await AsyncStorage.getItem(key);
        if (fallbackToken && fallbackToken.trim() !== '') {
          console.log(`✅ Found token with fallback key: ${key}`);
          setUserToken(fallbackToken);
          return fallbackToken;
        }
      }

      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData.token) {
            console.log('✅ Found token in userData');
            setUserToken(parsedData.token);
            return parsedData.token;
          }
        } catch (e) {
          // ignore invalid JSON
        }
      }

      console.log('❌ No token found');
      setUserToken(null);
      return null;
    } catch (error) {
      console.error('❌ Error getting user token:', error);
      setUserToken(null);
      return null;
    }
  };

  const plans = [
    {
      id: 'free',
      title: 'Free Plan',
      price: 'Free',
      features: [
        '5 trash requests per day',
        'Lower priority visibility',
        'Manual rider management',
        'Basic waste collection',
        'Standard support'
      ],
      color: '#6B778C',
      icon: 'account-outline'
    },
    {
      id: 'premium',
      title: 'Premium Plan',
      price: 'PKR 500',
      features: [
        'Unlimited trash requests',
        'High priority visibility',
        'App-based rider network',
        'Advanced waste management',
        'Priority customer support',
        'Analytics dashboard'
      ],
      color: '#00875A',
      recommended: true,
      icon: 'crown'
    }
  ];

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('Please select a plan');
      return;
    }

    try {
      setSubmitting(true);

      // Always fetch the freshest token using your getter
      const token = await getUserToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please login again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      const requestUrl = resolveUrlForDevice(RAGMAN_SUBSCRIBE_API);
      console.log('POST ->', requestUrl);

      const resp = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan.title }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        // For free plan, go directly to portal since no payment needed
        if (selectedPlan.id === 'free') {
          // Refresh navigation controller to check status
          navigation.navigate('AppNavigationController');
        } else {
          // For premium plan, go to payment
          navigation.navigate('PaymentScreen', { selectedPlan });
        }
        return;
      }

      if (resp.status === 403) {
        Alert.alert(
          'Email not verified',
          'Please verify your email to continue.',
          [
            { text: 'Verify Now', onPress: () => navigation.navigate('VerificationScreen') },
            { text: 'OK' },
          ]
        );
      } else if (resp.status === 401) {
        Alert.alert('Session expired', 'Please login again.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]);
      } else if (resp.status === 404) {
        Alert.alert('Profile not found', 'Ragman profile not found.');
      } else if (resp.status === 400) {
        Alert.alert('Invalid request', data?.error || 'Please try again.');
      } else {
        Alert.alert('Error', data?.error || 'Subscription update failed.');
      }
    } catch (e) {
      console.log('Subscribe error:', e);
      const hint =
        Platform.OS === 'android'
          ? '\nHint: On Android emulator use 10.0.2.2 or allow clear-text traffic.'
          : '';
      Alert.alert('Network error', `Couldn't reach the server.${hint}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0052CC" barStyle="light-content" />
      <View style={[styles.subscriptionHeader, {backgroundColor: '#0052CC'}]}>
        <Icon name="star-circle" size={60} color="#FFFFFF" />
        <Text style={styles.subscriptionTitle}>Choose Your Plan</Text>
        <Text style={styles.subscriptionSubtitle}>
          Start with Free or unlock unlimited potential with Premium
        </Text>
      </View>

      <ScrollView style={styles.subscriptionContent}>
        <View style={styles.legalNotice}>
          <Icon name="gavel" size={20} color="#505F79" />
          <Text style={styles.legalText}>
            By subscribing, you agree to follow government-regulated waste collection rates and procedures.
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan?.id === plan.id && styles.selectedPlan,
                { borderLeftColor: plan.color, borderLeftWidth: 4 }
              ]}
              onPress={() => setSelectedPlan(plan)}
              activeOpacity={0.9}
            >
              {plan.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={styles.planTitleRow}>
                  <Icon name={plan.icon} size={24} color={plan.color} />
                  <Text style={styles.planTitle}>{plan.title}</Text>
                </View>
                <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
              </View>

              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={plan.color} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {plan.id === 'free' && (
                <View style={styles.planNote}>
                  <Icon name="information" size={16} color="#FF8B00" />
                  <Text style={styles.noteText}>
                    Perfect for getting started with basic waste collection
                  </Text>
                </View>
              )}

              {plan.id === 'premium' && (
                <View style={styles.planNote}>
                  <Icon name="trending-up" size={16} color="#00875A" />
                  <Text style={styles.noteText}>
                    Maximize your earnings with unlimited requests and priority
                  </Text>
                </View>
              )}

              {selectedPlan?.id === plan.id && (
                <View style={styles.selectedIndicator}>
                  <Icon name="check-circle" size={20} color="#1F6FEB" />
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            (!selectedPlan || submitting) && styles.disabledButton
          ]}
          onPress={handleSubscribe}
          disabled={!selectedPlan || submitting}
        >
          <Text style={styles.subscribeText}>
            {submitting 
              ? 'Please wait…' 
              : selectedPlan?.id === 'free' 
                ? 'Start with Free Plan' 
                : 'Subscribe & Continue to Payment'
            }
          </Text>
        </TouchableOpacity>

        {selectedPlan && (
          <View style={styles.planSummary}>
            <Text style={styles.summaryTitle}>Plan Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Plan:</Text>
              <Text style={styles.summaryValue}>{selectedPlan.title}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price:</Text>
              <Text style={styles.summaryValue}>{selectedPlan.price}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Daily Requests:</Text>
              <Text style={styles.summaryValue}>
                {selectedPlan.id === 'free' ? '5 requests' : 'Unlimited'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  subscriptionHeader: {
    alignItems: 'center',
    padding: 24,
  },
  subscriptionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  subscriptionContent: {
    flex: 1,
    padding: 16,
  },
  legalNotice: {
    flexDirection: 'row',
    backgroundColor: '#E9EFFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 13,
    color: '#505F79',
    marginLeft: 8,
    flex: 1,
  },
  plansContainer: {
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  selectedPlan: {
    borderWidth: 2,
    borderColor: '#0052CC',
    elevation: 6,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#00875A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 16,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#172B4D',
    marginLeft: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planFeatures: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#505F79',
    marginLeft: 10,
    flex: 1,
  },
  planNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 6,
    flex: 1,
    fontStyle: 'italic',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  selectedText: {
    marginLeft: 6,
    color: '#1F6FEB',
    fontWeight: '700',
    fontSize: 16,
  },
  subscribeButton: {
    backgroundColor: '#0052CC',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    elevation: 2,
  },
  subscribeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#DFE1E6',
  },
  planSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#172B4D',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#505F79',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#172B4D',
  },
});

export default SubscriptionScreen;