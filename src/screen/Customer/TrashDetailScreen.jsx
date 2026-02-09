import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar as RNStatusBar,
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Trash Detail Screen Component
const TrashDetailScreen = ({ route, navigation }) => {
  const { item } = route.params || { 
    name: 'Default Item',
    image: require('@assets/plastic.jpeg'),
    recyclable: true,
    description: 'Default description about this waste item and how it can be properly handled or recycled. This provides users with the necessary information to dispose of this item responsibly.',
    points: 45,
    weight: '0.25 kg',
    impactStats: {
      waterSaved: '10 liters',
      energySaved: '1.2 kWh',
      co2Reduced: '0.8 kg'
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      {/* Solid Green Header */}
      <View style={styles.solidHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{item.name}</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Hero Image with Gradient Overlay */}
      <View style={styles.heroImageContainer}>
        <Image source={item.image} style={styles.heroImage} />
        
        
        {/* Header with glass effect */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{item.name}</Text>
          </View>
          <TouchableOpacity style={styles.infoButton}>
            <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.detailContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Floating card with main info */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.detailTitle}>{item.name}</Text>
              <View style={[styles.recyclableBadge, 
                { backgroundColor: item.recyclable ? '#10b981' : '#ef4444' }]}>
                <Ionicons name={item.recyclable ? "leaf" : "close-circle"} size={14} color="#fff" />
                <Text style={styles.badgeText}>
                  {item.recyclable ? 'Recyclable' : 'Non-recyclable'}
                </Text>
              </View>
            </View>
            <View style={styles.pointsContainer}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pointsBadge}
              >
                <Text style={styles.pointsValue}>{item.points}</Text>
                <Text style={styles.pointsLabel}>POINTS</Text>
              </LinearGradient>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="scale-outline" size={20} color="#64748b" />
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Average Weight</Text>
                <Text style={styles.statValue}>{item.weight}</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={20} color="#64748b" />
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Water Saved</Text>
                <Text style={styles.statValue}>{item.impactStats?.waterSaved || '0'}</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="flash-outline" size={20} color="#64748b" />
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Energy Saved</Text>
                <Text style={styles.statValue}>{item.impactStats?.energySaved || '0'}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>About this item</Text>
          <Text style={styles.detailDescription}>{item.description}</Text>
        </View>

        {/* Impact section */}
        <View style={styles.impactCard}>
          <Text style={styles.sectionTitle}>Environmental Impact</Text>
          <Text style={styles.impactText}>
            By recycling this item, you help reduce CO2 emissions by {item.impactStats?.co2Reduced || '0'}
            and conserve valuable natural resources.
          </Text>
          
          <View style={styles.impactIconRow}>
            <View style={styles.impactIconItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="leaf" size={24} color="#10b981" />
              </View>
              <Text style={styles.iconLabel}>Eco-friendly</Text>
            </View>
            <View style={styles.impactIconItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="earth" size={24} color="#10b981" />
              </View>
              <Text style={styles.iconLabel}>Sustainable</Text>
            </View>
            <View style={styles.impactIconItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="repeat" size={24} color="#10b981" />
              </View>
              <Text style={styles.iconLabel}>Recyclable</Text>
            </View>
          </View>
        </View>
        
        {/* Tips section */}
        <View style={styles.tipsCard}>
          <Text style={styles.sectionTitle}>Tips for disposal</Text>
          <View style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            </View>
            <Text style={styles.tipText}>Clean the item before recycling</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            </View>
            <Text style={styles.tipText}>Remove any non-recyclable parts</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            </View>
            <Text style={styles.tipText}>Flatten to save space in recycling bin</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
  style={styles.addTrashButton}
  onPress={() => navigation.navigate('CheckOrderScreen', { 
  item,
  cartItems: route.params?.cartItems || [], // Add this line
  capturedImage: route.params?.capturedImage 
})}
>
  <LinearGradient
    colors={['#10b981', '#047857']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.buttonGradient}
  >
    <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
    <Text style={styles.addTrashButtonText}>Add to Collection</Text>
  </LinearGradient>
</TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  solidHeader: {
    backgroundColor: '#a4e692',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : RNStatusBar.currentHeight + 10,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  heroImageContainer: {
    height: height * 0.35,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailContainer: {
    flex: 1,
    marginTop: -40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  recyclableBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  pointsContainer: {
    marginLeft: 16,
  },
  pointsBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pointsValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  pointsLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTextContainer: {
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  impactCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  impactText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 20,
  },
  impactIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  impactIconItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIconContainer: {
    marginRight: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  addTrashButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addTrashButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TrashDetailScreen;