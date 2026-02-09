// RiderProfileScreen.jsx - Professional Industry Standard (Fixed)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar as RNStatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GET_USER_PROFILE_API,
  UPDATE_USER_PROFILE_API,
  UPLOAD_PROFILE_PICTURE_API,
  GET_USER_POINTS_API,
  RIDER_UPDATE_PROFILE_API,
  RIDER_ME_API
} from '../../config';

const RiderProfileScreen = ({ route }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    profilePicture: null,
    role: '',
    points: 0,
    memberSince: '',
    completedPickups: 0,
    rating: 4.8,
    // Rider-specific fields
    licenseNo: '',
    vehicle: '',
    isAvailable: true
  });

  const [editedProfile, setEditedProfile] = useState({});

  useEffect(() => {
    fetchUserProfile();
    fetchUserPoints();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@jwt_token');
      
      if (!token) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.reset({
          index: 0,
          routes: [{ name: 'RiderLogin' }],
        });
        return;
      }

      const response = await fetch(GET_USER_PROFILE_API, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const memberSince = new Date(data.memberSince).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
        });
        
        let profilePictureUrl = null;
        if (data.profilePicture) {
          if (data.profilePicture.startsWith('http')) {
            profilePictureUrl = data.profilePicture;
          } else if (data.profilePicture.startsWith('/uploads')) {
            profilePictureUrl = `http://192.168.14.2:3000${data.profilePicture}`;
          } else {
            profilePictureUrl = data.profilePicture;
          }
        }
        
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          description: data.description || '',
          profilePicture: profilePictureUrl,
          role: data.role || '',
          points: data.totalPoints || 0,
          memberSince: memberSince,
          completedPickups: data.completedPickups || 0,
          rating: data.rating || 4.8,
          // Rider-specific fields
          licenseNo: data.licenseNo || '',
          vehicle: data.vehicle || '',
          isAvailable: data.isAvailable !== undefined ? data.isAvailable : true
        });

        setEditedProfile({
          name: data.name || '',
          phone: data.phone || '',
          description: data.description || '',
          licenseNo: data.licenseNo || '',
          vehicle: data.vehicle || ''
        });
      } else if (response.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.reset({
          index: 0,
          routes: [{ name: 'RiderLogin' }],
        });
      } else {
        Alert.alert('Error', 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const token = await AsyncStorage.getItem('@jwt_token');
      if (!token) return;

      const response = await fetch(GET_USER_POINTS_API, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({ ...prev, points: data.totalPoints || 0 }));
      }
    } catch (error) {
      console.error('Error fetching points:', error);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@jwt_token');

      if (!editedProfile.name.trim()) {
        Alert.alert('Validation Error', 'Name cannot be empty');
        setLoading(false);
        return;
      }

      // Validate rider-specific fields
      if (!editedProfile.phone || !editedProfile.phone.trim()) {
        Alert.alert('Validation Error', 'Phone number is required');
        setLoading(false);
        return;
      }

      if (!editedProfile.licenseNo || !editedProfile.licenseNo.trim()) {
        Alert.alert('Validation Error', 'License number is required');
        setLoading(false);
        return;
      }

      if (!editedProfile.vehicle || !editedProfile.vehicle.trim()) {
        Alert.alert('Validation Error', 'Vehicle details are required');
        setLoading(false);
        return;
      }

      let updateSuccess = true;
      let errorMessage = '';

      // 1. Update user table fields (name, description) using PATCH /api/user/profile
      const userFieldsChanged = editedProfile.name !== profile.name ||
                                 editedProfile.description !== profile.description;

      if (userFieldsChanged) {
        const userProfileData = {};
        if (editedProfile.name !== profile.name) {
          userProfileData.name = editedProfile.name.trim();
        }
        if (editedProfile.description !== profile.description) {
          userProfileData.description = editedProfile.description?.trim() || '';
        }

        const userResponse = await fetch(UPDATE_USER_PROFILE_API, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userProfileData),
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          errorMessage = errorData.message || 'Failed to update user profile';
          updateSuccess = false;
        }
      }

      // 2. Update rider table fields (phone, licenseNo, vehicle) using PATCH /api/rider/profile
      if (updateSuccess) {
        const riderFieldsChanged = editedProfile.phone !== profile.phone ||
                                    editedProfile.licenseNo !== profile.licenseNo ||
                                    editedProfile.vehicle !== profile.vehicle;

        if (riderFieldsChanged) {
          const riderProfileData = {
            phone: editedProfile.phone.trim(),
            licenseNo: editedProfile.licenseNo.trim(),
            vehicle: editedProfile.vehicle.trim()
          };

          const riderResponse = await fetch(RIDER_UPDATE_PROFILE_API, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(riderProfileData),
          });

          if (!riderResponse.ok) {
            const errorData = await riderResponse.json();
            errorMessage = errorData.message || 'Failed to update rider profile';
            updateSuccess = false;
          }
        }
      }

      // 3. Handle response
      if (updateSuccess) {
        setProfile(prev => ({ ...prev, ...editedProfile }));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');

        if (editedProfile.name !== profile.name) {
          await AsyncStorage.setItem('@uname', editedProfile.name);
        }
      } else {
        Alert.alert('Error', errorMessage || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const pickProfileImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@jwt_token');

      const formData = new FormData();
      formData.append('profilePicture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      const response = await fetch(UPLOAD_PROFILE_PICTURE_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        let profilePictureUrl = null;
        if (data.profilePictureUrl) {
          if (data.profilePictureUrl.startsWith('http')) {
            profilePictureUrl = data.profilePictureUrl;
          } else {
            profilePictureUrl = `http://192.168.14.2:3000${data.profilePictureUrl}`;
          }
        }
        
        setProfile(prev => ({ ...prev, profilePicture: profilePictureUrl }));
        Alert.alert('Success', 'Profile picture updated successfully');
      } else {
        Alert.alert('Error', 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['@jwt_token', '@uname', '@email']);
              navigation.reset({
                index: 0,
                routes: [{ name: 'RiderLogin' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchUserPoints()]);
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#9921E8" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      {/* Fixed Header */}
      <LinearGradient
        colors={['#9921E8', '#7C3AED']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.headerButton}>
            <Ionicons name={isEditing ? "close" : "create-outline"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={pickProfileImage} disabled={loading} activeOpacity={0.8}>
            <View style={styles.profileImageContainer}>
              {profile.profilePicture ? (
                <Image 
                  source={{ uri: profile.profilePicture }} 
                  style={styles.profileImage}
                  onError={() => setProfile(prev => ({ ...prev, profilePicture: null }))}
                />
              ) : (
                <View style={styles.defaultProfileImage}>
                  <Ionicons name="person" size={40} color="#9921E8" />
                </View>
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.profileName}>{profile.name}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="bicycle" size={14} color="#9921E8" />
            <Text style={styles.roleText}>{profile.role}</Text>
          </View>
          <Text style={styles.memberSince}>Member since {profile.memberSince}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{profile.points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{profile.completedPickups}</Text>
            <Text style={styles.statLabel}>Pickups</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="star-half" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{profile.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {/* Name */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editedProfile.name}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.name}</Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.emailRow}>
                <Text style={styles.fieldValue}>{profile.email}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                </View>
              </View>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Ionicons name="call-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editedProfile.phone}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.phone || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {/* License Number */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Ionicons name="card-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>License Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editedProfile.licenseNo}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, licenseNo: text }))}
                  placeholder="e.g., LHR-12345678"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.licenseNo || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {/* Vehicle Details */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldIcon}>
              <Ionicons name="car-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Vehicle Details</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={editedProfile.vehicle}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, vehicle: text }))}
                  placeholder="e.g., Honda CD70 - LHR 1234"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.vehicle || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {/* About */}
          <View style={[styles.fieldContainer, styles.lastField]}>
            <View style={styles.fieldIcon}>
              <Ionicons name="document-text-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>About Me</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  value={editedProfile.description}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, description: text }))}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile.description || 'No description provided'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false);
                setEditedProfile({
                  name: profile.name,
                  phone: profile.phone,
                  description: profile.description,
                  licenseNo: profile.licenseNo,
                  vehicle: profile.vehicle
                });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButtonWrapper}
              onPress={updateProfile}
              disabled={loading}
            >
              <LinearGradient
                colors={['#9921E8', '#7C3AED']}
                style={styles.saveButton}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 50,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
  },
  defaultProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9921E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9921E8',
  },
  memberSince: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  fieldContainer: {
    flexDirection: 'row',
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastField: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  fieldInput: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#9921E8',
    paddingBottom: 4,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default RiderProfileScreen;