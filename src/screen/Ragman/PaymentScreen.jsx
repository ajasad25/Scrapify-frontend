// PaymentScreen.jsx - Real Stripe Integration
// -------------------------------------------------------------
// - Integrates with backend payment API
// - Uses Stripe React Native for payment processing
// - Handles payment success and updates subscription status
// -------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { CREATE_PAYMENT_INTENT_API } from '../../config';

const MOCK_OVERRIDE_KEY = '@ragman_mock_override';

const PaymentScreen = ({ route, navigation }) => {
  const { selectedPlan } = route.params || {};
  const { confirmPayment } = useStripe();

  // Payment state
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [cardComplete, setCardComplete] = useState(false);

  // Safe plan fields
  const effectivePlanTitle = selectedPlan?.title || 'Premium Plan';
  const effectivePlanPrice = selectedPlan?.price || 'PKR 500';
  const effectivePlanColor = selectedPlan?.color || '#7C3AED';
  const planId = selectedPlan?.id || 'premium';

  // Fetch payment intent from backend
  useEffect(() => {
    fetchPaymentIntent();
  }, []);

  const fetchPaymentIntent = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@jwt_token');

      const response = await fetch(CREATE_PAYMENT_INTENT_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      setClientSecret(data.clientSecret);
      console.log('Payment intent created:', {
        amount: data.amount,
        currency: data.currency,
        planTitle: data.planTitle,
      });
    } catch (error) {
      console.error('Payment intent error:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to initialize payment. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset to controller as the new root
  const resetToController = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AppNavigationController' }],
      })
    );
  };

  // Store override so the controller shows the portal immediately
  const completePayment = async () => {
    const token = await AsyncStorage.getItem('@jwt_token');
    const override = {
      enabled: true,
      currentStep: 'portal',
      subscriptionPlan: effectivePlanTitle,
      token,
    };

    try {
      await AsyncStorage.setItem(MOCK_OVERRIDE_KEY, JSON.stringify(override));
    } catch (e) {
      console.warn('Failed to store override:', e);
    }

    resetToController();
  };

  const handlePayment = async () => {
    if (!clientSecret) {
      Alert.alert('Error', 'Payment not initialized. Please try again.');
      return;
    }

    setLoading(true);

    try {
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        Alert.alert('Payment Failed', error.message);
        setLoading(false);
      } else if (paymentIntent) {
        console.log('Payment successful:', paymentIntent);

        // Wait for webhook to process (2 seconds)
        console.log('Waiting for webhook to update backend...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        setLoading(false);
        setPaymentSuccess(true);
        // The webhook will update the subscription in the backend
      }
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert('Payment Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#7C3AED" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: effectivePlanColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Icon name="crown" size={60} color="#F59E0B" />
        <Text style={styles.headerTitle}>Premium Subscription</Text>
        <Text style={styles.headerSubtitle}>
          Subscribe to {effectivePlanTitle} to unlock all features
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Chosen Plan */}
        <View style={styles.planDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Icon name="star" size={24} color={effectivePlanColor} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.planTitle}>{effectivePlanTitle}</Text>
              <Text style={styles.planPrice}>{effectivePlanPrice}</Text>
            </View>
          </View>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          <View style={styles.benefitItem}>
            <Icon name="infinity" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Unlimited daily requests</Text>
          </View>
          <View style={styles.benefitItem}>
            <Icon name="lightning-bolt" size={20} color="#F59E0B" />
            <Text style={styles.benefitText}>Instant request visibility</Text>
          </View>
          <View style={styles.benefitItem}>
            <Icon name="message-text" size={20} color="#7C3AED" />
            <Text style={styles.benefitText}>Direct customer chat</Text>
          </View>
          <View style={styles.benefitItem}>
            <Icon name="truck-delivery" size={20} color="#059669" />
            <Text style={styles.benefitText}>Rider dispatch service</Text>
          </View>
        </View>

        {/* Card Form */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Text style={styles.secureText}>
            <Icon name="lock" size={14} color="#10B981" /> Secured by Stripe
          </Text>

          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8 }}>
              👇 Tap here and enter card details:
            </Text>

            <CardField
              postalCodeEnabled={false}
              placeholders={{
                number: '4242 4242 4242 4242',
                expiry: 'MM/YY',
                cvc: 'CVC',
              }}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
                fontSize: 16,
                placeholderColor: '#9CA3AF',
              }}
              style={styles.cardField}
              onCardChange={(cardDetails) => {
                console.log('Card details changed:', {
                  complete: cardDetails.complete,
                  validNumber: cardDetails.validNumber,
                  validExpiryDate: cardDetails.validExpiryDate,
                  validCVC: cardDetails.validCVC,
                });
                setCardComplete(cardDetails.complete);
              }}
            />

            <Text style={{ fontSize: 12, color: cardComplete ? '#10B981' : '#F59E0B', marginTop: 4, fontWeight: '600' }}>
              {cardComplete ? '✓ Card details complete' : '⚠ Enter: Card Number → Expiry → CVC'}
            </Text>
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              Test card: 4242424242424242 | 1228 | 123
            </Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payButton, (loading || !clientSecret) && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading || !clientSecret}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="lock" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.payButtonText}>Pay {effectivePlanPrice}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Status message */}
        {!clientSecret && (
          <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 8, textAlign: 'center' }}>
            Initializing payment...
          </Text>
        )}
        {clientSecret && (
          <Text style={{ fontSize: 12, color: '#10B981', marginTop: 8, textAlign: 'center' }}>
            Ready for testing - button enabled
          </Text>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Icon name="shield-check" size={16} color="#6B7280" />
          <Text style={styles.securityText}>
            Your payment is secure and encrypted. Cancel anytime.
          </Text>
        </View>
      </ScrollView>

      {/* Success Overlay */}
      {paymentSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Icon name="check-circle" size={60} color="#10B981" />
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>
              You've subscribed to{' '}
              <Text style={{ fontWeight: 'bold' }}>{effectivePlanTitle}</Text>
            </Text>
            <Text style={styles.successAmount}>{effectivePlanPrice}</Text>

            <TouchableOpacity style={styles.continueButton} onPress={completePayment}>
              <Icon name="arrow-right" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.continueButtonText}>Go to Ragman Portal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    alignItems: 'center',
    padding: 24,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 10
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#DDD6FE',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Body
  content: { flex: 1, padding: 20 },

  // Plan card
  planDetails: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  planPrice: {
    fontSize: 16,
    marginTop: 2,
    color: '#059669',
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#7C3AED',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Benefits
  benefitsContainer: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
    elevation: 2,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // Card form
  cardContainer: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    elevation: 2,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827'
  },
  secureText: {
    fontSize: 12,
    color: '#10B981',
    marginBottom: 12,
    fontWeight: '600',
  },
  cardField: {
    width: '100%',
    height: 60,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 4,
  },

  // Pay button
  payButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },

  // Security notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Success overlay
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  successCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: '85%',
    elevation: 10,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 12
  },
  successSubtitle: {
    fontSize: 15,
    color: '#374151',
    marginVertical: 8,
    textAlign: 'center'
  },
  successAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginTop: 6
  },
  continueButton: {
    marginTop: 24,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
});

export default PaymentScreen;
