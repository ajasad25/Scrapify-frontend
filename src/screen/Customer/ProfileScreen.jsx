// ProfileScreen.jsx - Professional Industry-Grade UI
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
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated
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
  GET_MY_REQUESTS_API
} from '../../config';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ route }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const scrollY = new Animated.Value(0);

  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    profilePicture: null,
    role: '',
    points: 0,
    memberSince: ''
  });

  const [stats, setStats] = useState({
    totalRequests: 0,
    completedRequests: 0,
    activeRequests: 0,
    totalEarnings: 0
  });

  const [editedProfile, setEditedProfile] = useState({});

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    await Promise.all([
      fetchUserProfile(),
      fetchUserPoints(),
      fetchUserStats()
    ]);
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@jwt_token');

      if (!token) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.reset({
          index: 0,
          routes: [{ name: 'CustomerLoginScreen' }],
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
          memberSince: memberSince
        });

        setEditedProfile({
          name: data.name || '',
          phone: data.phone || '',
          description: data.description || ''
        });
      } else if (response.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.reset({
          index: 0,
          routes: [{ name: 'CustomerLoginScreen' }],
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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

  const fetchUserStats = async () => {
    try {
      const token = await AsyncStorage.getItem('@jwt_token');
      if (!token) return;

      const response = await fetch(GET_MY_REQUESTS_API, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const requests = data.requests || [];

        const completed = requests.filter(r => r.status === 'COMPLETED').length;
        const active = requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;
        const totalEarnings = requests
          .filter(r => r.status === 'COMPLETED')
          .reduce((sum, r) => sum + (r.totalValue || 0), 0);

        setStats({
          totalRequests: requests.length,
          completedRequests: completed,
          activeRequests: active,
          totalEarnings: totalEarnings
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateProfile = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('@jwt_token');

    if (!editedProfile.name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty');
      return;
    }

    const response = await fetch(UPDATE_USER_PROFILE_API, {
      method: 'PATCH',  // ← CHANGE: Use PATCH instead of PUT
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editedProfile),
    });

    if (response.ok) {
      setProfile(prev => ({ ...prev, ...editedProfile }));
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');

      if (editedProfile.name) {
        await AsyncStorage.setItem('@uname', editedProfile.name);
      }
    } else {
      Alert.alert('Error', 'Failed to update profile');
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
        Alert.alert('Success', 'Profile picture updated');
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
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['@jwt_token', '@uname', '@email']);
              navigation.reset({
                index: 0,
                routes: [{ name: 'CustomerLoginScreen' }],
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
    await loadProfileData();
    setRefreshing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditedProfile({
      name: profile.name,
      phone: profile.phone,
      description: profile.description
    });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={["#166534", "#22c55e"]} style={styles.gradientBackground}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Animated Header Background */}
      <Animated.View style={[styles.headerBackground, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={["#166534", "#22c55e"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Animated.Text style={[styles.headerTitle, { opacity: headerOpacity }]}>
          {profile.name}
        </Animated.Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('MyRequestsScreen')}
          style={styles.headerButton}
        >
          <Ionicons name="time-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={["#166534", "#22c55e"]}
          style={styles.heroSection}
        >
          {/* Profile Picture */}
          <TouchableOpacity
            onPress={pickProfileImage}
            disabled={loading}
            style={styles.profilePictureContainer}
          >
            {profile.profilePicture ? (
              <Image
                source={{ uri: profile.profilePicture }}
                style={styles.profilePicture}
                onError={() => setProfile(prev => ({ ...prev, profilePicture: null }))}
              />
            ) : (
              <View style={styles.defaultProfilePicture}>
                <Ionicons name="person" size={60} color="#999" />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile.name}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
            <Text style={styles.roleText}>{profile.role}</Text>
          </View>
          <Text style={styles.memberSince}>Member since {profile.memberSince}</Text>
        </LinearGradient>

        {/* Quick Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.statGradient}
            >
              <Ionicons name="cube-outline" size={28} color="#fff" />
              <Text style={styles.statValue}>{stats.totalRequests}</Text>
              <Text style={styles.statLabel}>Total Requests</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.statGradient}
            >
              <Ionicons name="checkmark-circle-outline" size={28} color="#fff" />
              <Text style={styles.statValue}>{stats.completedRequests}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.statGradient}
            >
              <Ionicons name="time-outline" size={28} color="#fff" />
              <Text style={styles.statValue}>{stats.activeRequests}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.statGradient}
            >
              <Ionicons name="wallet-outline" size={28} color="#fff" />
              <Text style={styles.statValue}>PKR {stats.totalEarnings.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Points Card with Premium Design */}
        <View style={styles.pointsCard}>
          <LinearGradient
            colors={['#FFD700', '#FFA500', '#FF6B00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsGradient}
          >
            <View style={styles.pointsHeader}>
              <View style={styles.trophyContainer}>
                <Ionicons name="trophy" size={36} color="#fff" />
              </View>
              <View style={styles.pointsInfo}>
                <Text style={styles.pointsValue}>{profile.points}</Text>
                <Text style={styles.pointsLabel}>Reward Points</Text>
              </View>
              <TouchableOpacity
                style={styles.pointsRefreshBtn}
                onPress={fetchUserPoints}
              >
                <Ionicons name="refresh" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.pointsFooter}>
              <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.pointsHint}>Redeem points for vouchers in Cart</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AddTrashScreen')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="add-circle" size={28} color="#3b82f6" />
              </View>
              <Text style={styles.actionText}>Add Trash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('CartScreen', { cartItems: [] })}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="cart" size={28} color="#22c55e" />
              </View>
              <Text style={styles.actionText}>My Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyRequestsScreen')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="list" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.actionText}>Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setIsEditing(!isEditing)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="settings" size={28} color="#8b5cf6" />
              </View>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailsHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Ionicons
                name={isEditing ? "close-circle" : "pencil"}
                size={24}
                color={isEditing ? "#ef4444" : "#3b82f6"}
              />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedProfile.name}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your name"
                />
              ) : (
                <Text style={styles.infoValue}>{profile.name}</Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color="#22c55e" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <View style={styles.emailRow}>
                <Text style={styles.infoValue}>{profile.email}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                </View>
              </View>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color="#8b5cf6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedProfile.phone}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{profile.phone || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={[styles.infoCard, styles.descriptionCard]}>
            <View style={styles.infoIcon}>
              <Ionicons name="document-text-outline" size={20} color="#f59e0b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>About Me</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.infoInput, styles.textArea]}
                  value={editedProfile.description}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, description: text }))}
                  placeholder="Tell us about yourself..."
                  multiline
                  numberOfLines={4}
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile.description || 'No description provided'}
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={cancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={updateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout Button */}
        {!isEditing && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={22} color="#fff" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
    fontWeight: '500',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? RNStatusBar.currentHeight + 60 : 100,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 80 : 130,
    paddingBottom: 40,
    alignItems: 'center',
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePicture: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    borderColor: '#fff',
    backgroundColor: '#f8f9fa',
  },
  defaultProfilePicture: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    borderColor: '#fff',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  memberSince: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  pointsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  pointsGradient: {
    padding: 20,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trophyContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsInfo: {
    flex: 1,
    marginLeft: 16,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginTop: 2,
  },
  pointsRefreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  pointsHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  quickActions: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  detailsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  descriptionCard: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  infoInput: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#22c55e',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  logoutGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProfileScreen;
