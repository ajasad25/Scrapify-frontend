import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('screen'); // NOT get('window') — this fixes it!

const posters = [
  require('@assets/1.jpg'),
  require('@assets/2.jpg'),
  require('@assets/4.jpg'),
];

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);

  // Auto-skip countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-skip to JoinScrapify when countdown reaches 0
          setTimeout(() => {
            navigation.navigate('JoinScrapify');
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation]);

  const handleSkip = () => {
    navigation.navigate('JoinScrapify');
  };

  const handleNext = () => {
    if (currentIndex < posters.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.navigate('JoinScrapify');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Auto-skip countdown in top-left */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>
          {countdown > 0 ? `Auto-skip in ${countdown}s` : 'Skipping...'}
        </Text>
      </View>

      <FlatList
        data={posters}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        ref={flatListRef}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <ImageBackground source={item} style={styles.poster} resizeMode="cover" />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {currentIndex === 0 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>
          {currentIndex === posters.length - 1 ? 'DONE' : 'NEXT'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  poster: {
    width: width,
    height: height, // Full screen including nav bar
    justifyContent: 'flex-end',
  },
  countdownContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 60 : 40,
    left: 20,
    backgroundColor: 'rgba(30, 160, 55, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  countdownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 60 : 40,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
    elevation: 3,
  },
  nextButton: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 30,
    right: 30,
    backgroundColor: '#1ea037',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
