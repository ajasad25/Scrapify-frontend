import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet, // keep your styles as-is
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RAGMAN_VERIFICATION_API,
  RAGMAN_VERIFICATION_STATUS_API,
} from '../../config';

// --- helpers for basic PK formats ---
const onlyDigits = (s = '') => s.replace(/\D/g, '');
const normalizeCnic = (s = '') => {
  const d = onlyDigits(s);
  if (d.length !== 13) return s.trim();
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};
const isValidCnic = (s = '') => /^\d{5}-?\d{7}-?\d$/.test(s.replace(/\s/g, ''));

const normalizePhonePK = (s = '') => {
  let d = onlyDigits(s);
  if (d.startsWith('92')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d.length === 10 && d.startsWith('3') ? `+92${d}` : s.trim();
};
const isValidPhonePK = (s = '') => /^\+923\d{9}$/.test(normalizePhonePK(s));

const normalizeNtn = (s = '') => onlyDigits(s);
const isValidNtn = (s = '') => /^\d{7,9}$/.test(normalizeNtn(s)); // 7–9

const VerificationScreen = ({ navigation, onStatusChange, userStatus }) => {
  const [cnicFront, setCnicFront] = useState(null);
  const [cnicBack, setCnicBack] = useState(null);
  const [cnicNumber, setCnicNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+92');
  const [ntnNumber, setNtnNumber] = useState('');
  const [showCnicModal, setShowCnicModal] = useState(false);

  const [userToken, setUserToken] = useState(null);

  // verification status gating
  const [statusLoading, setStatusLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerificationSubmitted, setIsVerificationSubmitted] = useState(false);
  const [polling, setPolling] = useState(false);

  // token debug + load on mount
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
    
    // Check if user already has verification details submitted
    if (userStatus?.hasVerificationDetails && !userStatus?.isVerified) {
      setIsVerificationSubmitted(true);
      setPolling(true); // Start polling for approval
    } else if (userStatus?.isVerified) {
      setIsVerified(true);
    } else {
      // Only fetch status if we don't have userStatus from parent
      if (!userStatus) {
        fetchVerificationStatus();
      }
    }
  }, [userStatus]);

  // start/stop polling after submit
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => {
      fetchVerificationStatus();
    }, 10000); // Increased to 10 seconds to be less aggressive
    return () => clearInterval(id);
  }, [polling]);

  // auto-continue when approved
  useEffect(() => {
    if (isVerified) {
      setPolling(false); // Stop polling
      Alert.alert(
        'Verification Approved!',
        'Congratulations! Your business has been verified by our admin team. You can now proceed to choose your subscription plan.',
        [{ 
          text: 'Continue', 
          onPress: () => {
            if (onStatusChange) {
              onStatusChange(); // This will trigger navigation to subscription
            } else {
              navigation.navigate('SubscriptionScreen');
            }
          }
        }]
      );
    }
  }, [isVerified, navigation, onStatusChange]);

  // your robust token getter
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
          const parsed = JSON.parse(userData);
          if (parsed.token) {
            console.log('✅ Found token in userData');
            setUserToken(parsed.token);
            return parsed.token;
          }
        } catch {}
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

  const fetchVerificationStatus = async () => {
    try {
      setStatusLoading(true);
      const token = await getUserToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please login again.');
        return;
      }
      if (!RAGMAN_VERIFICATION_STATUS_API) {
        Alert.alert('Config error', 'RAGMAN_VERIFICATION_STATUS_API is undefined in config.js.');
        return;
      }
      const resp = await fetch(RAGMAN_VERIFICATION_STATUS_API, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        const approved = !!data?.verificationStatus;
        const hasDetails = !!data?.verificationDetails;
        
        setIsVerified(approved);
        setIsVerificationSubmitted(hasDetails && !approved);
        
        // Notify parent component to refresh status
        if (onStatusChange && (approved || hasDetails)) {
          onStatusChange();
        }
      } else if (resp.status === 404) {
        // No ragman profile found - this is expected for first-time users
        console.log('No ragman profile found - user needs to submit verification');
      } else if (resp.status === 401) {
        Alert.alert('Session expired', 'Please login again.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        console.log('Verification status error:', data?.error);
      }
    } catch (e) {
      console.log('Status error:', e);
    } finally {
      setStatusLoading(false);
    }
  };

  const mockUploadFile = (side) => {
    const mockFileName = side === 'front' ? 'CNIC_Front.jpg' : 'CNIC_Back.jpg';
    if (side === 'front') setCnicFront({ name: mockFileName });
    else setCnicBack({ name: mockFileName });
    setShowCnicModal(false);
  };

  const submitVerification = async () => {
    try {
      // Validate fields (backend requires cnic, ntn, phoneNumber)
      const cn = normalizeCnic(cnicNumber);
      const ph = normalizePhonePK(phoneNumber);
      const nt = normalizeNtn(ntnNumber);

      if (!isValidCnic(cn)) {
        Alert.alert('Invalid CNIC', 'Enter a valid CNIC (13 digits), e.g. 35202-1234567-1.');
        return;
      }
      if (!isValidPhonePK(ph)) {
        Alert.alert('Invalid phone', 'Enter a valid PK mobile number like +923XXXXXXXXX.');
        return;
      }
      if (!isValidNtn(nt)) {
        Alert.alert('Invalid NTN', 'Enter a valid NTN (7–9 digits).');
        return;
      }
      if (!cnicFront || !cnicBack) {
        Alert.alert('CNIC images required', 'Please upload front and back images of CNIC.');
        return;
      }

      const token = await getUserToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please login again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }
      if (!RAGMAN_VERIFICATION_API) {
        Alert.alert('Config error', 'RAGMAN_VERIFICATION_API is undefined in config.js.');
        return;
      }

      const payload = { cnic: cn, ntn: nt, phoneNumber: ph };
      console.log('POST ->', RAGMAN_VERIFICATION_API, payload);

      const resp = await fetch(RAGMAN_VERIFICATION_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        setIsVerificationSubmitted(true);
        Alert.alert(
          'Verification Submitted Successfully',
          'Your verification details have been submitted to our admin team for review. You will be notified once your business is approved. This typically takes 24-48 hours.\n\nYou can check your status anytime by logging back into the app.',
          [{ text: 'OK' }]
        );
        setPolling(true); // start polling for approval
        fetchVerificationStatus(); // immediate first check
        if (onStatusChange) onStatusChange(); // Notify parent to refresh status
        return;
      }

      if (resp.status === 404) {
        Alert.alert('Profile not found', 'Ragman profile not found for this account.');
      } else if (resp.status === 401) {
        Alert.alert('Session expired', 'Please login again.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]);
      } else if (resp.status === 400) {
        Alert.alert('Invalid data', data?.error || 'Please check your details and try again.');
      } else {
        Alert.alert('Error', data?.error || 'Failed to save verification.');
      }
    } catch (err) {
      console.log('Verification error:', err);
      Alert.alert('Network error', 'Could not reach the server. Please try again.');
    }
  };

  // Show pending verification UI if verification is submitted but not approved
  if (isVerificationSubmitted && !isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FF6B35" barStyle="light-content" />
        <View style={[styles.header, { backgroundColor: '#FF6B35' }]}>
          <View style={styles.headerContent}>
            <Icon name="clock-outline" size={32} color="#FFFFFF" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Verification Under Review</Text>
              <Text style={styles.headerSubtitle}>Please wait for admin approval</Text>
            </View>
          </View>
          <View style={styles.headerDivider} />
          <Text style={styles.headerDescription}>
            Your business verification is currently being reviewed by our admin team
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoSection, { backgroundColor: '#FFF3E0', borderLeftColor: '#FF6B35' }]}>
            <View style={styles.infoHeader}>
              <Icon name="progress-clock" size={20} color="#F57C00" />
              <Text style={[styles.infoTitle, { color: '#F57C00' }]}>Under Review</Text>
            </View>
            <Text style={[styles.infoText, { color: '#E65100' }]}>
              Your verification documents and business details have been submitted successfully. Our admin team is currently reviewing your information to ensure compliance with regulatory requirements.
            </Text>
          </View>

          <View style={styles.documentsSection}>
            <Text style={styles.sectionTitle}>Submitted Information</Text>
            
            <View style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <View style={styles.documentTitleSection}>
                  <Icon name="check-circle" size={24} color="#4CAF50" />
                  <View style={styles.documentTitleContainer}>
                    <Text style={styles.documentTitle}>Business Verification Details</Text>
                    <Text style={styles.documentSubtitle}>All required documents submitted</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#FF6B35' }]}
            onPress={fetchVerificationStatus}
            disabled={statusLoading}
          >
            <Icon name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.submitText}>
              {statusLoading ? 'Checking Status...' : 'Refresh Status'}
            </Text>
          </TouchableOpacity>

          <View style={styles.processingInfo}>
            <Icon name="information-outline" size={16} color="#757575" />
            <Text style={styles.processingText}>
              Verification typically takes 24-48 hours during business days. You will be automatically notified once approved.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show normal verification form if not submitted or if verification failed
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1B5E20" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="domain" size={32} color="#FFFFFF" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Business Registration</Text>
            <Text style={styles.headerSubtitle}>Securities & Exchange Commission of Pakistan</Text>
          </View>
        </View>
        <View style={styles.headerDivider} />
        <Text style={styles.headerDescription}>
          Complete your business verification to start operations on Scrapify platform
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Icon
              name={isVerified ? 'check-decagram' : statusLoading ? 'progress-clock' : 'shield-alert'}
              size={20}
              color={isVerified ? '#2E7D32' : '#1565C0'}
            />
            <Text style={styles.infoTitle}>
              {isVerified ? 'Verified' : 'Business Verification Required'}
            </Text>
          </View>
          <Text style={styles.infoText}>
            {isVerified
              ? 'Your business is approved. You can continue to subscriptions.'
              : 'Please provide your business verification details to comply with regulatory requirements.'}
          </Text>
        </View>

        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Required Details</Text>

          {/* CNIC Upload */}
          <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentTitleSection}>
                <Icon name="card-account-details" size={24} color="#1B5E20" />
                <View style={styles.documentTitleContainer}>
                  <Text style={styles.documentTitle}>CNIC</Text>
                  <Text style={styles.documentSubtitle}>Upload front and back</Text>
                  <Text style={styles.requiredText}>*Required</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.uploadButton} onPress={() => setShowCnicModal(true)}>
              <Icon
                name={cnicFront && cnicBack ? 'check-circle' : 'cloud-upload'}
                size={24}
                color={cnicFront && cnicBack ? '#2E7D32' : '#1565C0'}
              />
              <Text style={styles.uploadText}>
                {cnicFront && cnicBack ? 'CNIC Uploaded' : 'Upload CNIC'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CNIC Number */}
          <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentTitleSection}>
                <Icon name="badge-account" size={24} color="#1B5E20" />
                <View style={styles.documentTitleContainer}>
                  <Text style={styles.documentTitle}>CNIC Number</Text>
                  <Text style={styles.documentSubtitle}>13 digits (dashes allowed)</Text>
                  <Text style={styles.requiredText}>*Required</Text>
                </View>
              </View>
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="35202-1234567-1"
              keyboardType="number-pad"
              value={cnicNumber}
              onChangeText={setCnicNumber}
              onBlur={() => setCnicNumber(normalizeCnic(cnicNumber))}
            />
          </View>

          {/* Phone */}
          <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentTitleSection}>
                <Icon name="phone" size={24} color="#1B5E20" />
                <View style={styles.documentTitleContainer}>
                  <Text style={styles.documentTitle}>Phone Number</Text>
                  <Text style={styles.documentSubtitle}>Must start with +92</Text>
                  <Text style={styles.requiredText}>*Required</Text>
                </View>
              </View>
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="+923001234567"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              onBlur={() => setPhoneNumber(normalizePhonePK(phoneNumber))}
            />
          </View>

          {/* NTN */}
          <View style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentTitleSection}>
                <Icon name="file-document-outline" size={24} color="#1B5E20" />
                <View style={styles.documentTitleContainer}>
                  <Text style={styles.documentTitle}>National Tax Number (NTN)</Text>
                  <Text style={styles.documentSubtitle}>7–9 digits</Text>
                  <Text style={styles.requiredText}>*Required</Text>
                </View>
              </View>
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="Enter NTN"
              keyboardType="number-pad"
              value={ntnNumber}
              onChangeText={setNtnNumber}
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity 
          style={[styles.submitButton, isVerified && { opacity: 0.5 }]} 
          onPress={submitVerification} 
          disabled={isVerified}
        >
          <Icon name="send" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitText}>
            {isVerified ? 'Already Verified' : 'Submit for Verification'}
          </Text>
        </TouchableOpacity>

        <View style={styles.processingInfo}>
          <Icon name="clock-outline" size={16} color="#757575" />
          <Text style={styles.processingText}>
            Verification typically takes 24-48 hours. You will be notified once approved.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* CNIC Upload Modal */}
      <Modal
        visible={showCnicModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCnicModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Upload CNIC</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => mockUploadFile('front')}>
              <Text style={styles.modalOptionText}>Upload Front Side</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => mockUploadFile('back')}>
              <Text style={styles.modalOptionText}>Upload Back Side</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCnicModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#C8E6C9',
    marginTop: 2,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#4CAF50',
    marginBottom: 12,
  },
  headerDescription: {
    fontSize: 14,
    color: '#E8F5E9',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1565C0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0D47A1',
    lineHeight: 20,
  },
  documentsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  documentHeader: {
    marginBottom: 12,
  },
  documentTitleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  documentSubtitle: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  requiredText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
    marginTop: 4,
  },
  uploadButton: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 16, backgroundColor: '#1B5E20' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerTextContainer: { marginLeft: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#c8e6c9', fontSize: 12 },
  headerDivider: { height: 1, backgroundColor: '#388E3C', marginVertical: 8 },
  headerDescription: { color: '#dcedc8', fontSize: 13 },
  content: { padding: 16 },
  infoSection: { marginBottom: 20 },
  infoHeader: { flexDirection: 'row', alignItems: 'center' },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  infoText: { marginTop: 8, color: '#333' },
  documentsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  documentCard: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 14, elevation: 2 },
  documentHeader: { marginBottom: 8 },
  documentTitleSection: { flexDirection: 'row', alignItems: 'center' },
  documentTitleContainer: { marginLeft: 10 },
  documentTitle: { fontSize: 16, fontWeight: 'bold' },
  documentSubtitle: { fontSize: 12, color: '#555' },
  requiredText: { fontSize: 12, color: '#d32f2f', fontWeight: 'bold' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 10, borderRadius: 6 },
  uploadText: { marginLeft: 10, color: '#1565C0', fontWeight: 'bold' },
  uploadedText: { color: '#2E7D32' },
  inputField: { backgroundColor: '#fff', borderRadius: 6, padding: 10, fontSize: 15, borderColor: '#ccc', borderWidth: 1 },
  disclaimerSection: { backgroundColor: '#fff3e0', padding: 12, borderRadius: 6, marginBottom: 16 },
  disclaimerText: { fontSize: 12, color: '#444', marginTop: 6 },
  submitButton: { flexDirection: 'row', backgroundColor: '#1B5E20', padding: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  processingInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  processingText: { marginLeft: 6, color: '#757575', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalOption: { paddingVertical: 10 },
  modalOptionText: { fontSize: 16, color: '#1565C0' },
  modalCancel: { marginTop: 10, alignItems: 'center' },
  modalCancelText: { color: '#d32f2f', fontWeight: 'bold' },

  uploadedButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
    borderStyle: 'solid',
  },
  uploadText: {
    fontSize: 14,
    color: '#1565C0',
    marginLeft: 8,
    fontWeight: '500',
  },
  uploadedText: {
    color: '#2E7D32',
  },
  disclaimerSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6F00',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#E65100',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 16,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  processingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  processingText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 6,
    textAlign: 'center',
  },
});

export default VerificationScreen;