import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ImageBackground, 
  Dimensions, 
  Platform, 
  StatusBar 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// Re-importing to ensure we use the same icons, using lucide-react-native for consistency where available
import Icon from 'react-native-vector-icons/Feather';
import { ArrowRight, ChevronRight, Home, LogIn, Users, TrendingUp, Award, Leaf, Truck } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- ASSET PLACEHOLDERS ---
// NOTE: These assets must be available in your @assets folder.
const BACKGROUND_IMAGES = {
  Customer: require('@assets/customer.jpeg'), // Placeholder
  Ragman: require('@assets/ragman.jpeg'),     // Placeholder
  Rider: require('@assets/rider.jpeg'),       // Placeholder
  default: require('@assets/background.png'), // Placeholder
};

const RoleWelcomeScreen = ({ role, onGetStarted, onLogin }) => (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
    <ImageBackground 
      source={BACKGROUND_IMAGES[role.title] || BACKGROUND_IMAGES.default}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient 
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']} 
        style={styles.fullOverlay}
      >
        <View style={styles.contentWrapper}>
          <BlurView 
            intensity={90} 
            tint="dark"
            style={styles.blurContainer}
          >
            <View style={[styles.card, { borderColor: role.color }]}>
              <LinearGradient
                colors={[role.color, role.color + 'A0']} // Gradient for the icon background
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrapper}
              >
                {/* Clone the icon to change its color to white for better contrast */}
                {React.cloneElement(role.icon, { color: 'white', size: 36 })}
              </LinearGradient>

              <Text style={styles.title}>Welcome to Scrapify!</Text>
              <Text style={[styles.subtitle, { color: role.color }]}>{role.title}</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.description}>
                {role.title === 'Customer' && "Join our community and make recycling a part of your lifestyle. Shop recycled products and schedule pickups with just a few taps."}
                {role.title === 'Ragman' && "Turn waste collection into a profitable venture. Connect with customers, collect scraps, and earn money while helping the environment."}
                {role.title === 'Rider' && "Be your own boss and earn by delivering recyclables in your area. Set your own schedule and grow with our expanding network."}
              </Text>
              
              {/* Get Started Button (Primary) */}
              <TouchableOpacity 
                style={[styles.getStartedButton, { backgroundColor: role.color }]} 
                onPress={onGetStarted}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <ArrowRight color="#fff" size={20} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              
              {/* Login Button (Secondary/Ghost) */}
              <TouchableOpacity 
                style={[styles.loginButton, { borderColor: role.color }]} 
                onPress={onLogin}
              >
                <LogIn color={role.color} size={20} style={{ marginRight: 8 }} />
                <Text style={[styles.loginButtonText, { color: role.color }]}>Already have an account? Login</Text>
              </TouchableOpacity>
              
              {/* Go Back Button */}
              <TouchableOpacity onPress={() => onGetStarted('back')} style={styles.goBackButton}>
                <Text style={styles.goBackText}>&larr; Go Back</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </LinearGradient>
    </ImageBackground>
  </View>
);

export default function JoinScrapify() {
  const [selectedRole, setSelectedRole] = useState(null);
  const navigation = useNavigation();

  const roles = [
    {
      title: 'Customer',
      description: 'Shop & Recycle easily',
      icon: <Leaf size={24} color="#4CAF50" />, // Changed to Leaf for a more eco-friendly feel
      color: '#4CAF50', // Emerald Green
      signupPath: 'Signup',
      loginPath: 'CustomerLoginScreen',
      bgColor: '#E8F5E9',
    },
    {
      title: 'Ragman',
      description: 'Collect scraps & earn money!',
      icon: <Award size={24} color="#5468FF" />, // Changed to Award for prestige/value
      color: '#3B82F6', // Royal Blue
      signupPath: 'Signup',
      loginPath: 'RagmanLogin',
      bgColor: '#EBF5FF',
    },
    {
      title: 'Rider',
      description: 'Deliver across your area!',
      icon: <Truck size={24} color="#BB36FF" />, // Changed to Truck from Feather Icon for consistency
      color: '#A855F7', // Deep Purple
      signupPath: 'Signup',
      loginPath: 'RiderLogin',
      bgColor: '#F3E8FF',
    },
  ];

  const handleRoleSelect = useCallback((role) => setSelectedRole(role), []);
  
  // Handle Get Started (Signup)
  const handleGetStarted = useCallback((action) => {
    if (action === 'back') {
      setSelectedRole(null);
    } else if (selectedRole) {
      navigation.navigate(selectedRole.signupPath, { 
        roleType: selectedRole.title,
        roleColor: selectedRole.color,
        roleBgColor: selectedRole.bgColor
      });
    }
  }, [selectedRole, navigation]);

  // Handle Login
  const handleLogin = useCallback(() => {
    if (selectedRole) {
      navigation.navigate(selectedRole.loginPath, { 
        roleType: selectedRole.title,
        roleColor: selectedRole.color,
        roleBgColor: selectedRole.bgColor
      });
    }
  }, [selectedRole, navigation]);
  
  const handleHomeClick = useCallback(() => navigation.navigate('GettingStarted'), [navigation]);

  if (selectedRole) {
    return (
      <RoleWelcomeScreen 
        role={selectedRole} 
        onGetStarted={handleGetStarted} 
        onLogin={handleLogin}
      />
    );
  }

  return (
    <View style={styles.mainScreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      <ImageBackground source={BACKGROUND_IMAGES.default} style={styles.header} resizeMode='cover'>
        <LinearGradient
          colors={['rgba(76, 175, 80, 0.9)', 'rgba(27, 94, 32, 0.7)']} // Richer green gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerOverlay}
        >
          <Text style={styles.headerTitle}>♻️ Join Scrapify</Text>
          <Text style={styles.headerSubtitle}>Choose your role and start your green journey</Text>
        </LinearGradient>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.roleList}>
        {roles.map((role, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.roleItem} 
            onPress={() => handleRoleSelect(role)}
          >
            <View style={[styles.roleIconWrapper, { backgroundColor: role.bgColor }]}>
               {/* Clone the icon to ensure the color inside the role list is the role's color */}
              {React.cloneElement(role.icon, { color: role.color, size: 28 })}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, { color: '#333' }]}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </View>
            <ChevronRight color={role.color} size={24} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.homeButton} onPress={handleHomeClick}>
          <Home color="#4CAF50" size={24} />
          <Text style={styles.homeButtonText}>Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Global/Main Styles
  mainScreenContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light grey background for main screen
  },
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    width: width * 0.9,
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  // --- Header Styles ---
  header: {
    width: '100%',
    height: 250, // Slightly taller header
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 40,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800', // Bolder
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    // Enhanced text shadow for a professional pop
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: '#E0E0E0',
    fontSize: 17,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // --- Role Welcome Screen (Selected Role) Styles ---
  blurContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    // Professional shadow for the blur container
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  card: {
    padding: 30, // Increased padding
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Less transparent card background
    borderRadius: 20,
    borderWidth: 2, // Thicker border
    // Inner shadow effect on the card (using elevation for Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    // Stronger shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  divider: {
    height: 2, // Thicker divider
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
    width: '60%',
    alignSelf: 'center',
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30, // Increased margin
    lineHeight: 24,
    fontWeight: '400',
  },
  getStartedButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16, // Increased padding
    borderRadius: 12, // More squared corners
    marginTop: 10,
    // Stronger button shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700', // Bolder text
    fontSize: 18,
  },
  loginButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12, // More squared corners
    marginTop: 15,
    borderWidth: 2, // Thicker border
    backgroundColor: 'transparent', // Ensure it's transparent
  },
  loginButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  goBackButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  goBackText: {
    color: '#777',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  // --- Role List (Main Screen) Styles ---
  roleList: {
    padding: 20, // Increased padding
    paddingTop: 0,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16, // More rounded
    marginBottom: 16, // Increased margin
    // Professional shadow for the list item
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
    borderLeftWidth: 0, // Removed borderLeftWidth, using color for the icon background instead
  },
  roleIconWrapper: {
    width: 60, // Larger icon wrapper
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    // Subtle inner shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleTitle: {
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 2,
    color: '#333',
  },
  roleDescription: {
    color: '#777',
    fontSize: 14,
    fontWeight: '500',
  },
  // --- Bottom Bar Styles ---
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 15,
    alignItems: 'center',
    backgroundColor: 'white', // Clean white bottom bar
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0', // Slightly grey background for the button
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    // Clean, professional shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  homeButtonText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 15,
  },
});