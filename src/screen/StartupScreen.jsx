import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fonts } from '../utils/fonts';

const StartupScreen = () => {
  const navigation = useNavigation();
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations sequence
    startAnimationSequence();
    
    // Start continuous pulse animation for logo
    startPulseAnimation();
  }, []);

  const startAnimationSequence = () => {
    // Logo entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Tagline animation after logo
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Button animation after tagline
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(buttonScale, {
            toValue: 1,
            tension: 60,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Footer animation last
          Animated.timing(footerOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        });
      });
    });
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleGetStarted = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('Onboarding');
    });
  };

  const logoRotationInterpolate = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <LinearGradient
        colors={['#7ef76c', '#4cd94a', '#1ea037']}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Center Logo and Tagline */}
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.logoWrapper,
                {
                  transform: [
                    { scale: Animated.multiply(logoScale, pulseAnimation) },
                    { rotate: logoRotationInterpolate },
                  ],
                },
              ]}
            >
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
            
            <Animated.Text
              style={[
                styles.tagline,
                {
                  opacity: taglineOpacity,
                  transform: [{ translateY: taglineTranslateY }],
                },
              ]}
            >
              TURNING WASTE INTO WEALTH
            </Animated.Text>
            
            <Animated.Text
              style={[
                styles.subtitle,
                {
                  opacity: taglineOpacity,
                  transform: [{ translateY: taglineTranslateY }],
                },
              ]}
            >
              Sustainable Solutions for a Greener Tomorrow
            </Animated.Text>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <LinearGradient
              colors={['#1ea037', '#16852d']}
              style={styles.curveContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    opacity: buttonOpacity,
                    transform: [{ scale: buttonScale }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={handleGetStarted}
                  activeOpacity={0.85}
                >
                  <Text style={styles.getStartedText}>GET STARTED</Text>
                  <View style={styles.arrowCircle}>
                    <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Footer inside the curve */}
              <Animated.View
                style={[
                  styles.footer,
                  {
                    opacity: footerOpacity,
                  },
                ]}
              >
                <Text style={styles.footerText}>Scrapify Inc. © 2025</Text>
              </Animated.View>
            </LinearGradient>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

export default StartupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoWrapper: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 120,
    height: 120,
  },
  tagline: {
    color: 'white',
    fontSize: 20,
    fontFamily: fonts.Bold,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: fonts.Regular,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomSection: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
  },
  curveContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1ea037',
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonWrapper: {
    marginBottom: 15,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 35,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  getStartedText: {
    color: '#1ea037',
    fontSize: 16,
    fontFamily: fonts.SemiBold,
    marginRight: 12,
    letterSpacing: 0.5,
  },
  arrowCircle: {
    backgroundColor: '#1ea037',
    borderRadius: 18,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1ea037',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  footer: {
    marginTop: 15,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: fonts.Regular,
    letterSpacing: 0.5,
  },
});