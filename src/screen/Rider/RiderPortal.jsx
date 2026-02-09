import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

// Import screen components
import RiderProfileScreen from './RiderProfileScreen';
import RiderAssignmentsScreen from './RiderAssignmentsScreen';
import RiderHistoryScreen from './RiderHistoryScreen';

// Main Rider Portal Component
export default function RiderPortal() {
  const navigation = useNavigation();
  const [currentTab, setCurrentTab] = useState('assignments'); // 'assignments' | 'history' | 'profile'
  const [showFullProfile, setShowFullProfile] = useState(false);

  const handleBackFromProfile = () => {
    setShowFullProfile(false);
  };

  // Bottom Navigation
  const BottomNavigation = () => (
    <View style={styles.bottomNavigation}>
      <TouchableOpacity
        style={[styles.navItem, currentTab === 'assignments' && styles.navItemActive]}
        onPress={() => setCurrentTab('assignments')}
      >
        <Icon name="truck" size={20} color={currentTab === 'assignments' ? '#9921E8' : '#666'} />
        <Text style={[styles.navLabel, currentTab === 'assignments' && styles.navLabelActive]}>
          Assignments
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, currentTab === 'history' && styles.navItemActive]}
        onPress={() => setCurrentTab('history')}
      >
        <Icon name="clock" size={20} color={currentTab === 'history' ? '#9921E8' : '#666'} />
        <Text style={[styles.navLabel, currentTab === 'history' && styles.navLabelActive]}>
          History
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, currentTab === 'profile' && styles.navItemActive]}
        onPress={() => setCurrentTab('profile')}
      >
        <Icon name="user" size={20} color={currentTab === 'profile' ? '#9921E8' : '#666'} />
        <Text style={[styles.navLabel, currentTab === 'profile' && styles.navLabelActive]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );

  // If showing full profile, render ProfileScreen component
  if (showFullProfile) {
    return (
      <RiderProfileScreen 
        route={{
          params: {
            // Pass any needed params here
          }
        }}
        navigation={{
          ...navigation,
          goBack: handleBackFromProfile // Override goBack to return to rider portal
        }}
      />
    );
  }

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="light-content" backgroundColor="#9921E8" />

      {/* Content - Render the appropriate screen based on currentTab */}
      {currentTab === 'assignments' && <RiderAssignmentsScreen navigation={navigation} />}
      {currentTab === 'history' && <RiderHistoryScreen navigation={navigation} />}
      {currentTab === 'profile' && (
        <RiderProfileScreen
          route={{ params: {} }}
          navigation={{
            ...navigation,
            goBack: handleBackFromProfile,
          }}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    backgroundColor: '#f7f2ff',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#9921E8',
    fontWeight: '600',
  },
});