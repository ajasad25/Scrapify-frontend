// AppNavigationController.jsx (FIXED: user-scoped & one-shot mock override)
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import VerificationScreen from './VerificationScreen';
import SubscriptionScreen from './SubscriptionScreen';
import PaymentScreen from './PaymentScreen';
import RagmanPortal from './RagmanPortal';
import RagmanPremium from './RagmanPremium';
import { RAGMAN_COMPLETE_STATUS_API } from '../../config';

const MOCK_OVERRIDE_KEY = '@ragman_mock_override'; // mock flag

const AppNavigationController = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const getUserToken = useCallback(async () => {
    try {
      return await AsyncStorage.getItem('@jwt_token');
    } catch {
      return null;
    }
  }, []);

  const checkUserStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Get token first so we can safely validate the override against THIS user
      const token = await getUserToken();
      if (!token) {
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      // 1) Check for a USER-SCOPED mock override (used while Stripe is not integrated)
      const raw = await AsyncStorage.getItem(MOCK_OVERRIDE_KEY);
      if (raw) {
        try {
          const override = JSON.parse(raw);
          // Apply override ONLY if it belongs to this token
          if (override?.enabled && override?.token === token) {
            const plan = override.subscriptionPlan || 'Basic Plan';
            const step = override.currentStep || 'portal';

            setUserStatus({ ragman: { subscriptionPlan: plan }, currentStep: step });
            setCurrentStep(step);

            // One-shot: clear immediately so it can't affect future sessions/logins
            await AsyncStorage.removeItem(MOCK_OVERRIDE_KEY);

            setLoading(false);
            return; // skip backend while mocking for this user
          } else if (override?.enabled && override?.token && override.token !== token) {
            // Old override from a different user on the same device — remove it
            await AsyncStorage.removeItem(MOCK_OVERRIDE_KEY);
          } else if (override?.enabled && !override?.token) {
            // Legacy override without user binding — remove it to prevent leakage
            await AsyncStorage.removeItem(MOCK_OVERRIDE_KEY);
          }
        } catch {
          // Corrupt override; remove it
          await AsyncStorage.removeItem(MOCK_OVERRIDE_KEY);
        }
      }

      // 2) Otherwise, source of truth: backend
      const response = await fetch(RAGMAN_COMPLETE_STATUS_API, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const status = await response.json();
        setUserStatus(status);
        setCurrentStep(status?.currentStep || 'verification');
      } else if (response.status === 401) {
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', 'Unable to retrieve your status. Please try again.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not check your status.');
    } finally {
      setLoading(false);
    }
  }, [getUserToken, navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  switch (currentStep) {
    case 'verification':
      return <VerificationScreen navigation={navigation} onStatusChange={checkUserStatus} />;

    case 'pending_verification':
      return (
        <VerificationScreen
          navigation={navigation}
          onStatusChange={checkUserStatus}
          userStatus={userStatus}
        />
      );

    case 'subscription':
      return <SubscriptionScreen navigation={navigation} onStatusChange={checkUserStatus} />;

    case 'payment': {
      // Provide plan info to PaymentScreen when possible
      const selectedPlan =
        userStatus?.ragman?.pendingPlan
          ? userStatus.ragman.pendingPlan
          : userStatus?.ragman?.subscriptionPlan
          ? { title: userStatus.ragman.subscriptionPlan }
          : { title: 'Basic Plan', price: 'PKR 0' };

      return <PaymentScreen navigation={navigation} route={{ params: { selectedPlan } }} />;
    }

    case 'portal': {
      const plan = userStatus?.ragman?.subscriptionPlan;
      if (plan === 'Premium Plan') {
        return <RagmanPremium navigation={navigation} userStatus={userStatus} />;
      }
      return <RagmanPortal navigation={navigation} userStatus={userStatus} />;
    }

    default:
      return <VerificationScreen navigation={navigation} onStatusChange={checkUserStatus} />;
  }
};

export default AppNavigationController;
