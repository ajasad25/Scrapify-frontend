// config.js - Complete network configuration for external devices
import { Platform } from "react-native";
import Constants from 'expo-constants';

// STEP 1: Update this with your actual Wi-Fi IP from ipconfig
const LAN_IP = "192.168.100.19"; // Your Wi-Fi IP from ipconfig
const PORT = "3000";

// STEP 2: Your actual ngrok URL
const NGROK_URL = "https://a5549933572d.ngrok-free.app";

// Helper to detect if running on physical device
const isPhysicalDevice = () => {
  if (!Constants.isDevice) return false;
  if (!__DEV__) return true;
  
  // Check if device name indicates emulator/simulator
  const deviceName = Constants.deviceName || '';
  return !deviceName.includes('Simulator') && 
         !deviceName.includes('Android SDK') &&
         !deviceName.includes('sdk_gphone');
};

// Helper function to pick correct base URL
const getBaseUrl = () => {
  const isPhysical = isPhysicalDevice();
  
  console.log('=== NETWORK DEBUG INFO ===');
  console.log('Platform:', Platform.OS);
  console.log('Is Physical Device:', isPhysical);
  console.log('Device Name:', Constants.deviceName);
  console.log('__DEV__:', __DEV__);
  
  let baseUrl = '';
  
  if (Platform.OS === "android") {
    if (isPhysical) {
      // Physical Android device - use computer's IP
      baseUrl = `http://${LAN_IP}:${PORT}`;
      console.log('Using LAN IP for physical Android device');
    } else {
      // Android Emulator - use special localhost mapping
      baseUrl = `http://10.0.2.2:${PORT}`;
      console.log('Using emulator IP for Android emulator');
    }
  } else if (Platform.OS === "ios") {
    if (isPhysical) {
      // Physical iOS device - use computer's IP
      baseUrl = `http://${LAN_IP}:${PORT}`;
      console.log('Using LAN IP for physical iOS device');
    } else {
      // iOS simulator - can use localhost
      baseUrl = `http://localhost:${PORT}`;
      console.log('Using localhost for iOS simulator');
    }
  } else {
    // Web or other platforms
    baseUrl = __DEV__ ? `http://${LAN_IP}:${PORT}` : NGROK_URL;
    console.log('Using default configuration for web/other');
  }
  
  console.log('Final BASE_URL:', baseUrl);
  console.log('========================');
  
  return baseUrl;
};

// OPTION: Use ngrok for all devices (ENABLED - using your ngrok URL)
const BASE_URL = NGROK_URL;

// OPTION: Use automatic detection (DISABLED for now)
// const BASE_URL = getBaseUrl();

// Auth APIs
const LOGIN_API = `${BASE_URL}/api/auth/login`;
const REGISTER_API = `${BASE_URL}/api/auth/register`;
const OTP_API = `${BASE_URL}/api/auth/verify-otp`;
const FORGOT_PASSWORD_API = `${BASE_URL}/api/auth/forgot-password-request`;
const RESET_PASSWORD_API = `${BASE_URL}/api/auth/forgot-password-reset`;

// Trash/Waste APIs
const ADD_TRASH_API = `${BASE_URL}/api/trash/add`;
const GET_USER_POINTS_API = `${BASE_URL}/api/trash/points`;
const REDEEM_VOUCHER_API = `${BASE_URL}/api/trash/redeem-voucher`;

// Ragman APIs
const RAGMAN_SUBSCRIBE_API = `${BASE_URL}/api/ragman/subscribe`;
const RAGMAN_VERIFICATION_API = `${BASE_URL}/api/ragman/verification`;
const RAGMAN_ME_API = `${BASE_URL}/api/ragman/me`;
const RAGMAN_VERIFICATION_STATUS_API = `${BASE_URL}/api/ragman/verification/status`;
const RAGMAN_COMPLETE_STATUS_API = `${BASE_URL}/api/ragman/status/complete`;

// Rider APIs
const RIDER_ME_API = `${BASE_URL}/api/rider/me`;
const RIDER_UPDATE_PROFILE_API = `${BASE_URL}/api/rider/profile`;
const RIDER_GET_REQUESTS_API = `${BASE_URL}/api/rider/requests/available`;
const RIDER_ACCEPT_REQUEST_API = `${BASE_URL}/api/rider/requests/accept`;
const RIDER_GET_ACTIVE_RIDES_API = `${BASE_URL}/api/rider/requests/active`;
const RIDER_COMPLETE_REQUEST_API = `${BASE_URL}/api/rider/requests/complete`;

// Request System APIs
const GET_PENDING_REQUESTS_API = `${BASE_URL}/api/requests/pending`;
const ACCEPT_REQUEST_API = `${BASE_URL}/api/requests/accept`;
const GET_MY_ACCEPTED_REQUESTS_API = `${BASE_URL}/api/requests/my-accepted`;
const ASSIGN_RIDER_API = `${BASE_URL}/api/requests/assign-rider`;
const CREATE_REQUEST_API = `${BASE_URL}/api/requests/create`;
const CHECK_REQUEST_STATUS_API = `${BASE_URL}/api/requests/check-status`;
const GET_MY_REQUESTS_API = `${BASE_URL}/api/requests/my-requests`;

// Customer APIs (for RequestsHistoryScreen)
const GET_USER_REQUESTS_API = `${BASE_URL}/api/customer/requests`;

// User Profile APIs
const GET_USER_PROFILE_API = `${BASE_URL}/api/user/profile`;
const UPDATE_USER_PROFILE_API = `${BASE_URL}/api/user/profile/update`;
const UPLOAD_PROFILE_PICTURE_API = `${BASE_URL}/api/user/profile/upload-picture`;

// Rates APIs
const GET_LATEST_RATES_API = `${BASE_URL}/api/rates/latest`;

// Rider Assignment System APIs - Ragman Side
const GET_RAGMAN_ACCEPTED_REQUESTS_API = `${BASE_URL}/api/ragman/accepted-requests`;
const GET_AVAILABLE_RIDERS_API = `${BASE_URL}/api/ragman/riders/available`;
const RAGMAN_ASSIGN_RIDER_API = `${BASE_URL}/api/ragman/riders/assign`;

// Rider Assignment System APIs - Rider Side
const RIDER_GET_ASSIGNMENTS_API = `${BASE_URL}/api/rider/assignments`;
const RIDER_GET_HISTORY_API = `${BASE_URL}/api/rider/history`;
const RIDER_UPDATE_ASSIGNMENT_STATUS_API = `${BASE_URL}/api/rider/assignments/status`;
const RIDER_TOGGLE_AVAILABILITY_API = `${BASE_URL}/api/rider/availability`;
const TRACK_RIDER_API = (requestId) => `${BASE_URL}/api/requests/track-rider/${requestId}`;

// Chat APIs (Sendbird Integration)
const CHAT_INITIATE_API = `${BASE_URL}/api/chat/initiate`;
const CHAT_SEND_MESSAGE_API = `${BASE_URL}/api/chat/send`;
const CHAT_GET_MESSAGES_API = (channelUrl) => `${BASE_URL}/api/chat/messages/${channelUrl}`;
const CHAT_GET_TOKEN_API = `${BASE_URL}/api/chat/token`;
const CHAT_GET_CHANNELS_API = `${BASE_URL}/api/chat/channels`;
const CHAT_MARK_AS_READ_API = `${BASE_URL}/api/chat/mark-as-read`;

// Payment APIs (Stripe Integration)
const CREATE_PAYMENT_INTENT_API = `${BASE_URL}/api/payments/create-intent`;

// Wallet APIs
const GET_WALLET_BALANCE_API = `${BASE_URL}/api/wallet/balance`;
const GET_WALLET_TRANSACTIONS_API = `${BASE_URL}/api/wallet/transactions`;
const GET_WALLET_SUMMARY_API = `${BASE_URL}/api/wallet/summary`;

// Bank Account APIs
const GET_BANK_ACCOUNTS_API = `${BASE_URL}/api/withdrawals/bank-accounts`;
const ADD_BANK_ACCOUNT_API = `${BASE_URL}/api/withdrawals/bank-accounts`;
const SET_PRIMARY_BANK_ACCOUNT_API = `${BASE_URL}/api/withdrawals/bank-accounts/set-primary`;
const DELETE_BANK_ACCOUNT_API = (accountId) => `${BASE_URL}/api/withdrawals/bank-accounts/${accountId}`;

// Withdrawal APIs
const GET_WITHDRAWAL_SETTINGS_API = `${BASE_URL}/api/withdrawals/settings`;
const REQUEST_WITHDRAWAL_API = `${BASE_URL}/api/withdrawals/request`;
const GET_MY_WITHDRAWALS_API = `${BASE_URL}/api/withdrawals/my-withdrawals`;
const CANCEL_WITHDRAWAL_API = `${BASE_URL}/api/withdrawals/cancel`;

export {
  BASE_URL,
  LOGIN_API,
  REGISTER_API,
  OTP_API,
  FORGOT_PASSWORD_API,
  RESET_PASSWORD_API,
  ADD_TRASH_API,
  GET_USER_POINTS_API,
  REDEEM_VOUCHER_API,
  RAGMAN_SUBSCRIBE_API,
  RAGMAN_VERIFICATION_API,
  RAGMAN_ME_API,
  RAGMAN_VERIFICATION_STATUS_API,
  RAGMAN_COMPLETE_STATUS_API,
  RIDER_ME_API,
  RIDER_UPDATE_PROFILE_API,
  RIDER_GET_REQUESTS_API,
  RIDER_ACCEPT_REQUEST_API,
  RIDER_GET_ACTIVE_RIDES_API,
  RIDER_COMPLETE_REQUEST_API,
  GET_PENDING_REQUESTS_API,
  ACCEPT_REQUEST_API,
  GET_MY_ACCEPTED_REQUESTS_API,
  ASSIGN_RIDER_API,
  CREATE_REQUEST_API,
  CHECK_REQUEST_STATUS_API,
  GET_MY_REQUESTS_API,
  GET_USER_REQUESTS_API,
  GET_USER_PROFILE_API,
  UPDATE_USER_PROFILE_API,
  UPLOAD_PROFILE_PICTURE_API,
  GET_LATEST_RATES_API,
  // Rider Assignment System
  GET_RAGMAN_ACCEPTED_REQUESTS_API,
  GET_AVAILABLE_RIDERS_API,
  RAGMAN_ASSIGN_RIDER_API,
  RIDER_GET_ASSIGNMENTS_API,
  RIDER_GET_HISTORY_API,
  RIDER_UPDATE_ASSIGNMENT_STATUS_API,
  RIDER_TOGGLE_AVAILABILITY_API,
  TRACK_RIDER_API,
  // Chat APIs
  CHAT_INITIATE_API,
  CHAT_SEND_MESSAGE_API,
  CHAT_GET_MESSAGES_API,
  CHAT_GET_TOKEN_API,
  CHAT_GET_CHANNELS_API,
  CHAT_MARK_AS_READ_API,
  // Payment APIs
  CREATE_PAYMENT_INTENT_API,
  // Wallet APIs
  GET_WALLET_BALANCE_API,
  GET_WALLET_TRANSACTIONS_API,
  GET_WALLET_SUMMARY_API,
  // Bank Account APIs
  GET_BANK_ACCOUNTS_API,
  ADD_BANK_ACCOUNT_API,
  SET_PRIMARY_BANK_ACCOUNT_API,
  DELETE_BANK_ACCOUNT_API,
  // Withdrawal APIs
  GET_WITHDRAWAL_SETTINGS_API,
  REQUEST_WITHDRAWAL_API,
  GET_MY_WITHDRAWALS_API,
  CANCEL_WITHDRAWAL_API,
};