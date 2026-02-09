//CheckOrderScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar as RNStatusBar,
  Platform,
  Dimensions,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Check Order Screen Component
const CheckOrderScreen = ({ route, navigation }) => {
 const { item, capturedImage, cartItems = [] } = route.params || {
  item: {
    name: 'Default Item',
    image: require('@assets/plastic.jpeg'),
    points: 0,
    weight: '0 kg'
  },
  cartItems: []
};
  
  const [quantity, setQuantity] = useState('1');
  const [currentCartItems, setCurrentCartItems] = useState(cartItems);
  const [customerRate, setCustomerRate] = useState('');
  
  const handleQuantityChange = (text) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue === '' || parseInt(numericValue) === 0) {
      setQuantity('1');
    } else if (parseInt(numericValue) > 999) {
      setQuantity('999');
    } else {
      setQuantity(numericValue);
    }
  };
  
  const numericQuantity = parseInt(quantity) || 1;
  const totalPoints = item.points * numericQuantity;
  const totalAmount = 1750 * numericQuantity;

  // Calculate total cart summary
  const cartSummary = currentCartItems.reduce((acc, cartItem) => ({
    totalItems: acc.totalItems + cartItem.quantity,
    totalPoints: acc.totalPoints + (cartItem.points * cartItem.quantity),
    totalAmount: acc.totalAmount + (1750 * cartItem.quantity)
  }), { totalItems: 0, totalPoints: 0, totalAmount: 0 });

 
  
const handleAddMoreItems = () => {
  if (!customerRate || parseFloat(customerRate) <= 0) {
    Alert.alert('Rate Required', 'Please specify your rate per kg before continuing');
    return;
  }

  const newCartItem = {
    ...item,
    quantity: numericQuantity,
    customerRate: parseFloat(customerRate),
    id: Date.now()
  };

  const updatedCart = [...currentCartItems, newCartItem];
  navigation.navigate('AddTrashScreen', { cartItems: updatedCart });
};

  return (
    <LinearGradient
      colors={["#98ce76", "#166534"]}
      style={styles.gradientBackground}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      {Platform.OS === "android" && (
        <View style={{ height: RNStatusBar.currentHeight }} />
      )}
      
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Order</Text>
        {/* Cart Notification Badge */}
        {currentCartItems.length > 0 && (
          <TouchableOpacity 
            style={styles.cartBadge}
            onPress={() => navigation.navigate('CartScreen', { cartItems: currentCartItems })}
            activeOpacity={0.7}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{cartSummary.totalItems}</Text>
            </View>
          </TouchableOpacity>
        )}
        {currentCartItems.length === 0 && <View style={{ width: 24 }} />}
      </View>

      <ScrollView style={styles.orderContainer} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* Process Guide Banner */}
        <View style={styles.processGuideBanner}>
          <View style={styles.guideStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.guideStepText}>Select quantity</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#6b7280" />
          <View style={styles.guideStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.guideStepText}>Set your rate</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#6b7280" />
          <View style={styles.guideStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.guideStepText}>Continue</Text>
          </View>
        </View>

        {/* Current Cart Summary (if items exist) */}
        {currentCartItems.length > 0 && (
          <View style={styles.cartSummaryCard}>
            <View style={styles.cartSummaryHeader}>
              <Ionicons name="cart-outline" size={24} color="#166534" />
              <Text style={styles.cartSummaryTitle}>Current Cart ({cartSummary.totalItems} items)</Text>
            </View>
            <View style={styles.cartSummaryRow}>
              <Text style={styles.cartSummaryLabel}>Total Points:</Text>
              <Text style={styles.cartSummaryValue}>{cartSummary.totalPoints} Points</Text>
            </View>
            <View style={styles.cartSummaryRow}>
              <Text style={styles.cartSummaryLabel}>Total Value:</Text>
              <Text style={styles.cartSummaryAmount}>Rp {cartSummary.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        )}

        <View style={styles.orderCard}>
  <View style={styles.orderItemHeader}>
    <Image source={item.image} style={styles.orderItemImage} />
    <View style={styles.orderItemDetails}>
      <Text style={styles.orderItemName}>{item.name}</Text>
      <Text style={styles.orderItemWeight}>({item.weight})</Text>
      <View style={styles.pointsContainer}>
        <Text style={styles.orderItemPoints}>{item.points} Points each</Text>
      </View>
    </View>
  </View>

  {capturedImage && (
    <View style={styles.capturedImageSection}>
      <Text style={styles.sectionTitle}>Captured Image</Text>
      <Image source={{ uri: capturedImage.uri }} style={styles.capturedImage} />
      {capturedImage.location && (
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={18} color="#166534" />
          <Text style={styles.locationText}>
            Location: {capturedImage.location.latitude.toFixed(6)}, {capturedImage.location.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  )}
         
  {/* Enhanced Quantity Input */}
  <View style={styles.quantitySection}>
    <Text style={styles.quantityLabel}>Quantity</Text>
   
    {/* Direct Input Field */}
    <View style={styles.quantityInputWrapper}>
      <TextInput
        style={styles.quantityDirectInput}
        value={quantity}
        onChangeText={handleQuantityChange}
        keyboardType="numeric"
        placeholder="1"
        maxLength={3}
        selectTextOnFocus={true}
      />
      <Text style={styles.quantityUnit}>{item.name === 'Plastic Bottle' || item.weight === 'per piece' ? 'pieces' : 'kg'}</Text>
    </View>
   
    {/* Quick Select Buttons */}
    <View style={styles.quickSelectContainer}>
      <Text style={styles.quickSelectLabel}>Quick select:</Text>
      <View style={styles.quickSelectButtons}>
        {[5, 10, 25, 50, 100].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.quickSelectButton,
              parseInt(quantity) === num && styles.quickSelectButtonActive
            ]}
            onPress={() => handleQuantityChange(num.toString())}
          >
            <Text style={[
              styles.quickSelectButtonText,
              parseInt(quantity) === num && styles.quickSelectButtonTextActive
            ]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </View>

  {/* Customer Rate Input - Enhanced and Prominent */}
  <View style={styles.rateSection}>
    <View style={styles.rateLabelContainer}>
      <Ionicons name="cash-outline" size={20} color="#166534" />
      <Text style={styles.rateLabel}>Your Rate ({item.name === 'Plastic Bottle' || item.weight === 'per piece' ? 'per piece' : 'per kg'})</Text>
      <View style={styles.requiredBadge}>
        <Text style={styles.requiredText}>Required</Text>
      </View>
    </View>
    <View style={styles.rateInputContainer}>
      <Text style={styles.currencySymbol}>PKR</Text>
      <TextInput
        style={styles.rateInput}
        value={customerRate}
        onChangeText={setCustomerRate}
        keyboardType="numeric"
        placeholder="Enter amount"
        placeholderTextColor="#9ca3af"
        maxLength={5}
      />
      <Text style={styles.perKgText}>/{item.name === 'Plastic Bottle' || item.weight === 'per piece' ? 'piece' : 'kg'}</Text>
    </View>
    <View style={styles.rateHintContainer}>
      <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
      <Text style={styles.rateHint}>This rate will be confirmed with the Ragman</Text>
    </View>
  </View>
         
  {/* Current Item Summary */}
  <View style={styles.itemTotalSection}>
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Points Earned:</Text>
      <Text style={styles.totalValue}>{totalPoints} Points</Text>
    </View>
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Your Rate:</Text>
      <Text style={styles.totalValueAmount}>
        PKR {customerRate || '0'}/{item.name === 'Plastic Bottle' || item.weight === 'per piece' ? 'piece' : 'kg'} ({item.weight})
      </Text>
    </View>
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Expected Earning:</Text>
      <Text style={styles.totalValueAmount}>
        PKR {customerRate ? (parseFloat(customerRate) * (item.name === 'Plastic Bottle' || item.weight === 'per piece' ? 1 : parseFloat(item.weight.replace(' kg', '') || '0')) * numericQuantity).toFixed(2) : '0'}
      </Text>
    </View>
  </View>
</View>
        
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={22} color="#166534" />
            <Text style={styles.infoText}>
              A Rider will collect these items from your location. Rates will be finalized upon Ragman selection.
            </Text>
          </View>
        </View>

        {/* Points Rewards Section */}
<View style={styles.rewardsCard}>
  <View style={styles.rewardsHeader}>
    <Ionicons name="gift-outline" size={24} color="#166534" />
    <Text style={styles.rewardsTitle}>Points Rewards</Text>
  </View>
  <Text style={styles.rewardsSubtitle}>Redeem your points for cash vouchers:</Text>
  <View style={styles.rewardsList}>
    <View style={styles.rewardItem}>
      <Text style={styles.rewardPoints}>500 Points</Text>
      <Text style={styles.rewardValue}>= PKR 50 Voucher</Text>
    </View>
    <View style={styles.rewardItem}>
      <Text style={styles.rewardPoints}>1000 Points</Text>
      <Text style={styles.rewardValue}>= PKR 100 Voucher</Text>
    </View>
    <View style={styles.rewardItem}>
      <Text style={styles.rewardPoints}>2500 Points</Text>
      <Text style={styles.rewardValue}>= PKR 250 Voucher</Text>
    </View>
    <View style={styles.rewardItem}>
      <Text style={styles.rewardPoints}>5000 Points</Text>
      <Text style={styles.rewardValue}>= PKR 500 Voucher</Text>
    </View>
  </View>
</View>

        {/* Action Buttons - Simplified */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={handleAddMoreItems}
          >
            <Ionicons name="add-outline" size={20} color="#fff" />
            <Text style={styles.addMoreButtonText}>Add Another Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={() => {
              if (!customerRate || parseFloat(customerRate) <= 0) {
                Alert.alert('Rate Required', 'Please specify your rate per kg before continuing');
                return;
              }
              navigation.navigate('CartScreen', { cartItems: [...currentCartItems, {
                ...item,
                quantity: numericQuantity,
                customerRate: parseFloat(customerRate),
                id: Date.now()
              }] });
            }}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.viewCartButtonText}>View Cart</Text>
          </TouchableOpacity>
        </View>
        
      </ScrollView>
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
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cartCount: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderContainer: {
    flex: 1,
    backgroundColor: '#f8fafb',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cartSummaryCard: {
    backgroundColor: '#ecfdf3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  cartSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 8,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cartSummaryLabel: {
    fontSize: 14,
    color: '#374151',
  },
  cartSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  cartSummaryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  orderItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  orderItemWeight: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  pointsContainer: {
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  orderItemPoints: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  quantityContainer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quantityInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    minWidth: 40,
    paddingVertical: 4,
  },
  quantityUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  itemTotalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
 
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
  },
  totalValueAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
 
  findRagmanButton: {
    backgroundColor: '#166534',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
  },
  findRagmanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  capturedImageSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },

   quantitySection: {
  marginTop: 16,
},
quantityInputWrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f9fafb',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginVertical: 8,
},
quantityDirectInput: {
  flex: 1,
  fontSize: 18,
  fontWeight: '600',
  color: '#333',
  textAlign: 'center',
},
quantityUnit: {
  fontSize: 14,
  color: '#666',
  marginLeft: 8,
  fontWeight: '500',
},
quickSelectContainer: {
  marginTop: 8,
},
quickSelectLabel: {
  fontSize: 12,
  color: '#666',
  marginBottom: 6,
},
quickSelectButtons: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
quickSelectButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  backgroundColor: '#f1f5f9',
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#e2e8f0',
},
quickSelectButtonActive: {
  backgroundColor: '#166534',
  borderColor: '#166534',
},
quickSelectButtonText: {
  fontSize: 12,
  color: '#475569',
  fontWeight: '500',
},
quickSelectButtonTextActive: {
  color: '#fff',
},

rewardsCard: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 2,
},
rewardsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
rewardsTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
  marginLeft: 8,
},
rewardsSubtitle: {
  fontSize: 14,
  color: '#666',
  marginBottom: 12,
},
rewardsList: {
  gap: 8,
},
rewardItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 12,
  backgroundColor: '#f8fafc',
  borderRadius: 8,
},
rewardPoints: {
  fontSize: 14,
  fontWeight: '600',
  color: '#166534',
},
rewardValue: {
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
},

// Process Guide Banner Styles
processGuideBanner: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  marginHorizontal: 16,
  marginBottom: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 2,
},
guideStep: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
stepNumber: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#166534',
  alignItems: 'center',
  justifyContent: 'center',
},
stepNumberText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '700',
},
guideStepText: {
  fontSize: 12,
  color: '#374151',
  fontWeight: '500',
},

// Enhanced Rate Section Styles
rateSection: {
  marginTop: 20,
  paddingTop: 20,
  borderTopWidth: 1,
  borderTopColor: '#f0f0f0',
},
rateLabelContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  gap: 8,
},
rateLabel: {
  fontSize: 17,
  fontWeight: '700',
  color: '#333',
  flex: 1,
},
requiredBadge: {
  backgroundColor: '#fee2e2',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
},
requiredText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#dc2626',
},
rateInputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f0fdf4',
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#166534',
  paddingHorizontal: 16,
  paddingVertical: 14,
  marginBottom: 8,
},
currencySymbol: {
  fontSize: 18,
  fontWeight: '700',
  color: '#166534',
  marginRight: 8,
},
rateInput: {
  flex: 1,
  fontSize: 22,
  fontWeight: '700',
  color: '#166534',
  padding: 0,
},
perKgText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#6b7280',
  marginLeft: 8,
},
rateHintContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
rateHint: {
  fontSize: 13,
  color: '#6b7280',
  fontStyle: 'italic',
},

// Updated Button Styles
actionButtonsContainer: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 16,
},
addMoreButton: {
  flex: 1,
  backgroundColor: '#3b82f6',
  paddingVertical: 14,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#3b82f6',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 3,
},
addMoreButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
  marginLeft: 6,
},
viewCartButton: {
  flex: 1,
  backgroundColor: '#166534',
  paddingVertical: 14,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#166534',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 3,
},
viewCartButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
  marginLeft: 6,
},

});

export default CheckOrderScreen;