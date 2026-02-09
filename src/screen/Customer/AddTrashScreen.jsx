//AddTrashScreen.jsx
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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import TrashDetailScreen from './TrashDetailScreen';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GET_USER_PROFILE_API, GET_MY_REQUESTS_API } from '../../config';


const { width } = Dimensions.get('window');

// Category data with descriptions
const allCategories = [
  {
    id: '1',
    name: 'Plastic Bottle',
    image: require('@assets/plastic.jpeg'),
    recyclable: true,
    description: 'Plastic bottles are widely used in packaging of soft drinks, water, milk, and other beverages. They re primarily made of polyethylene terephthalate (PET). Recycling helps reduce environmental impact and conserves resources.',
    points: 1,
    weight: 'per piece'
  },
  {
    id: '2',
    name: 'Metal',
    image: require('@assets/metal.jpg'),
    recyclable: true,
    description: 'Metal waste includes aluminum cans, steel containers, and other metallic items. These materials can be recycled indefinitely without losing quality. Recycling metal saves energy and reduces mining impact.',
    points: 2,
    weight: '0.8 kg'
  },
  {
    id: '3',
    name: 'Paper',
    image: require('@assets/paper.jpg'),
    recyclable: true,
    description: 'Paper waste includes newspapers, magazines, office paper, and cardboard. Recycling paper saves trees, water, and energy. It helps reduce landfill space and greenhouse gas emissions.',
    points: 1,
    weight: '0.3 kg'
  },
  {
    id: '4',
    name: 'Wood',
    image: require('@assets/wood.jpg'),
    recyclable: true,
    description: 'Wood waste includes discarded furniture, pallets, and construction debris. Recycling wood reduces deforestation and can be converted into mulch, biomass fuel, or new wood products.',
    points: 2,
    weight: '1.2 kg'
  },
  {
    id: '5',
    name: 'Glass',
    image: require('@assets/glass.jpg'),
    recyclable: true,
    description: 'Glass containers like bottles and jars are 100% recyclable and can be recycled endlessly without loss in quality. Recycling glass reduces the need for raw materials and lowers energy consumption.',
    points: 2,
    weight: '0.7 kg'
  },
];

// Main screen component
const AddTrashScreen = ({ route, navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [categories, setCategories] = useState(allCategories);
  const [cartItems, setCartItems] = useState(route.params?.cartItems || []);
  const [userName, setUserName] = useState('User');
  const [userProfile, setUserProfile] = useState(null);
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);

  // Update categories based on search text
  useEffect(() => {
    if (searchText.trim() === '') {
      setCategories(allCategories);
    } else {
      const filtered = allCategories.filter(item => 
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setCategories(filtered);
    }
  }, [searchText]);

  useEffect(() => {
    fetchUserProfile();
    fetchActiveRequests();
  }, []);
  
  
  // Request camera permissions on component mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        
        if (cameraStatus !== 'granted' || locationStatus !== 'granted') {
          Alert.alert('Permission needed', 'We need camera and location permissions to fully use this feature.');
        }
      }
    })();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('@jwt_token');
      const storedName = await AsyncStorage.getItem('@uname');
      
      if (storedName) {
        setUserName(storedName);
      }
      
      if (token) {
        const response = await fetch(GET_USER_PROFILE_API, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const profileData = await response.json();
          setUserProfile(profileData);
          setUserName(profileData.name || storedName || 'User');
        }
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const fetchActiveRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('@jwt_token');
      
      if (token) {
        const response = await fetch(GET_MY_REQUESTS_API, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Count requests that are not completed or cancelled
          const activeCount = data.requests?.filter(
            req => req.status !== 'COMPLETED' && req.status !== 'CANCELLED'
          ).length || 0;
          setActiveRequestsCount(activeCount);
        }
      }
    } catch (error) {
      console.log('Error fetching requests:', error);
    }
  };

  // Function to open camera and capture image with location
  const openCamera = async () => {
    try {
      // Get current location first
      let location = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const locationResult = await Location.getCurrentPositionAsync({});
          location = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
          };
          console.log('Location captured:', location);
        }
      } catch (locError) {
        console.log('Error getting location:', locError);
        // Continue even if location fails
      }
      
      // Then launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Store both image URI and location data in state
        const imageData = {
          uri: result.assets[0].uri,
          location: location
        };
        setCapturedImage(imageData);
        console.log('Image captured:', result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  // Navigate to detail screen for a category
  const navigateToDetail = (item) => {
    navigation.navigate('TrashDetailScreen', { 
      item,
      cartItems: cartItems
    });
  };

  // New function to navigate to CheckOrderScreen with captured image
  const navigateWithCapturedImage = () => {
    navigation.navigate('CheckOrderScreen', { 
      capturedImage: capturedImage,
      cartItems: cartItems,
      item: {
        name: 'Captured Trash',
        image: { uri: capturedImage.uri },
        points: 5,
        weight: 'Pending',
        recyclable: true,
      }
    });
  };

  return (
    <LinearGradient
      colors={["#b6f492", "#338b93"]}
      style={styles.gradientBackground}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {Platform.OS === "android" && (
        <View style={{ height: RNStatusBar.currentHeight }} />
      )}
      
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sort Trash</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Hi, {userName}!</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('CustomerWalletScreen')}
            >
              <Ionicons name="wallet-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Add Trash Section */}
      <View style={styles.addTrashSection}>
        <Text style={styles.addTrashTitle}>Add Your Trash Today</Text>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for trash items..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#888"
          />
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        </View>
      </View>

      {/* Categories */}
      <ScrollView style={styles.categoriesContainer}>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => navigateToDetail(category)}
            >
              <Image source={category.image} style={styles.categoryImage} />
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.recyclableText}>
                {category.recyclable ? 'Recyclable' : 'Non-recyclable'}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Captured Image Card */}
          {capturedImage ? (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={navigateWithCapturedImage}
            >
              <Image source={{ uri: capturedImage.uri }} style={styles.categoryImage} />
              <Text style={styles.categoryName}>Captured Image</Text>
              <Text style={styles.recyclableText}>Tap to continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.categoryCard, styles.captureCardPlaceholder]}
              onPress={openCamera}
            >
              <View style={styles.captureIconContainer}>
                <Ionicons name="camera" size={40} color="#22c55e" />
              </View>
              <Text style={styles.categoryName}>Capture New</Text>
              <Text style={styles.recyclableText}>Take a photo of trash</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('AddTrashScreen')}
        >
          <Ionicons name="home" size={24} color="#ffffff" />
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('CustomerWalletScreen')}
        >
          <Ionicons name="wallet-outline" size={24} color="#e5e7eb" />
          <Text style={styles.navTextInactive}>Wallet</Text>
        </TouchableOpacity>

        {/* My Requests Button */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('MyRequestsScreen')}
        >
          <Ionicons name="list-outline" size={24} color="#e5e7eb" />
          <Text style={styles.navTextInactive}>Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('ProfileScreen', { userProfile })}
        >
          <Ionicons name="person-outline" size={24} color="#e5e7eb" />
          <Text style={styles.navTextInactive}>Profile</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
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
  welcomeSection: {
    backgroundColor: '#1f2937',
    padding: 16,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  notificationBtn: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTrashSection: {
    backgroundColor: '#22c55e',
    padding: 16,
    paddingBottom: 20,
  },
  addTrashTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  searchIcon: {
    marginLeft: 8,
  },
  categoriesContainer: {
    flex: 1,
    padding: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  categoryCard: {
    width: width / 2 - 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  categoryImage: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
    color: '#333',
  },
  recyclableText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  navIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  navTextActive: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  navTextInactive: {
    color: '#e5e7eb',
    fontSize: 12,
    marginTop: 2,
  },
  captureCardPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  captureIconContainer: {
    height: 130,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
});

export default AddTrashScreen;