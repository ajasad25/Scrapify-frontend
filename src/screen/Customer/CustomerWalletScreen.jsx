import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

// API imports
import {
  GET_WALLET_BALANCE_API,
  GET_WALLET_TRANSACTIONS_API,
  GET_WALLET_SUMMARY_API,
  GET_BANK_ACCOUNTS_API,
  ADD_BANK_ACCOUNT_API,
  SET_PRIMARY_BANK_ACCOUNT_API,
  DELETE_BANK_ACCOUNT_API,
  GET_WITHDRAWAL_SETTINGS_API,
  REQUEST_WITHDRAWAL_API,
  GET_MY_WITHDRAWALS_API,
  CANCEL_WITHDRAWAL_API,
} from '../../config';

// Helper function for authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('@jwt_token');

    const requestConfig = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Debug logging
    console.log('🌐 API Request:', {
      url,
      method: requestConfig.method || 'GET',
      headers: requestConfig.headers,
      body: requestConfig.body ? JSON.parse(requestConfig.body) : null
    });

    const response = await fetch(url, requestConfig);

    const data = await response.json();

    console.log('📥 API Response:', {
      status: response.status,
      ok: response.ok,
      data
    });

    if (!response.ok) {
      // Throw error with backend message if available
      const errorMsg = data.error || data.message || `API Error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Icon component
const Icon = ({ name, size = 20, color = '#4B5563', style }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);

// Card component
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const CustomerWalletScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('balance');
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletSummary, setWalletSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalSettings, setWithdrawalSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [bankForm, setBankForm] = useState({
    accountTitle: '',
    accountNumber: '',
    bankName: '',
    branchCode: ''
  });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);

  useEffect(() => {
    loadWalletData();
  }, [activeTab]);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'balance') {
        const [balanceData, summaryData] = await Promise.all([
          makeAuthenticatedRequest(GET_WALLET_BALANCE_API),
          makeAuthenticatedRequest(GET_WALLET_SUMMARY_API)
        ]);

        if (balanceData.success) setWalletBalance(balanceData.balance);
        if (summaryData.success) setWalletSummary(summaryData.summary);
      } else if (activeTab === 'transactions') {
        const data = await makeAuthenticatedRequest(GET_WALLET_TRANSACTIONS_API);
        if (data.success) setTransactions(data.transactions || []);
      } else if (activeTab === 'banks') {
        const data = await makeAuthenticatedRequest(GET_BANK_ACCOUNTS_API);
        if (data.success) setBankAccounts(data.accounts || []);
      } else if (activeTab === 'withdrawals') {
        const [withdrawalsData, settingsData] = await Promise.all([
          makeAuthenticatedRequest(GET_MY_WITHDRAWALS_API),
          makeAuthenticatedRequest(GET_WITHDRAWAL_SETTINGS_API)
        ]);

        console.log('💰 Withdrawal Settings Response:', settingsData);

        if (withdrawalsData.success) setWithdrawals(withdrawalsData.withdrawals || []);
        if (settingsData.success) {
          console.log('✅ Withdrawal Settings Loaded:', settingsData.settings);
          setWithdrawalSettings(settingsData.settings);
        } else {
          console.error('❌ Withdrawal Settings Failed to Load');
          Alert.alert('Configuration Error', 'Withdrawal settings are not configured. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  }, [activeTab]);

  // Bank Account Handlers
  const handleAddBankAccount = async () => {
    try {
      if (!bankForm.accountTitle || !bankForm.accountNumber || !bankForm.bankName) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const response = await makeAuthenticatedRequest(ADD_BANK_ACCOUNT_API, {
        method: 'POST',
        body: JSON.stringify(bankForm)
      });

      if (response.success) {
        Alert.alert('Success', 'Bank account added successfully');
        setShowAddBankModal(false);
        setBankForm({ accountTitle: '', accountNumber: '', bankName: '', branchCode: '' });
        loadWalletData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add bank account');
    }
  };

  const handleDeleteBankAccount = async (accountId) => {
    Alert.alert(
      'Delete Bank Account',
      'Are you sure you want to delete this bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await makeAuthenticatedRequest(DELETE_BANK_ACCOUNT_API(accountId), {
                method: 'DELETE'
              });
              if (response.success) {
                Alert.alert('Success', 'Bank account deleted');
                loadWalletData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bank account');
            }
          }
        }
      ]
    );
  };

  const handleSetPrimaryAccount = async (accountId) => {
    try {
      const response = await makeAuthenticatedRequest(SET_PRIMARY_BANK_ACCOUNT_API, {
        method: 'POST',
        body: JSON.stringify({ accountId })
      });
      if (response.success) {
        Alert.alert('Success', 'Primary account updated');
        loadWalletData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update primary account');
    }
  };

  // Withdrawal Handlers
  const handleRequestWithdrawal = async () => {
    try {
      // Validation
      if (!selectedBankAccount || !withdrawAmount) {
        Alert.alert('Error', 'Please select a bank account and enter amount');
        return;
      }

      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      // Prepare request data - ensure amount is a NUMBER not string
      const amountInPKR = Number(Math.round(amount));
      const requestData = {
        bankAccountId: String(selectedBankAccount), // Ensure it's a string UUID
        amount: amountInPKR // Ensure it's a number
      };

      // Type checking
      console.log('📊 Data Types:', {
        bankAccountIdType: typeof requestData.bankAccountId,
        amountType: typeof requestData.amount,
        bankAccountIdValue: requestData.bankAccountId,
        amountValue: requestData.amount
      });

      // Debug logging
      console.log('🔍 Withdrawal Request Data:', requestData);
      console.log('🔍 bankAccountId:', requestData.bankAccountId);
      console.log('🔍 amount:', requestData.amount);
      console.log('🔍 Request URL:', REQUEST_WITHDRAWAL_API);

      // Validate data before sending
      if (!requestData.bankAccountId) {
        console.error('❌ bankAccountId is missing!');
        Alert.alert('Error', 'Bank account ID is missing');
        return;
      }
      if (!requestData.amount || requestData.amount <= 0) {
        console.error('❌ amount is invalid!');
        Alert.alert('Error', 'Amount is invalid');
        return;
      }

      // Check if withdrawal settings exist
      if (!withdrawalSettings) {
        console.error('❌ Withdrawal settings not loaded!');
        Alert.alert('Configuration Error', 'Withdrawal settings are not configured on the server. Please contact support or try again later.');
        return;
      }

      // Validate amount against settings
      const minAmount = withdrawalSettings.minAmount || 0;
      const maxAmount = withdrawalSettings.maxAmount || Infinity;

      if (requestData.amount < minAmount) {
        Alert.alert('Invalid Amount', `Minimum withdrawal amount is ${withdrawalSettings.minAmountDisplay || 'PKR ' + minAmount}`);
        return;
      }

      if (requestData.amount > maxAmount) {
        Alert.alert('Invalid Amount', `Maximum withdrawal amount is ${withdrawalSettings.maxAmountDisplay || 'PKR ' + maxAmount}`);
        return;
      }

      const response = await makeAuthenticatedRequest(REQUEST_WITHDRAWAL_API, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      console.log('✅ Withdrawal Response:', response);

      if (response.success) {
        Alert.alert('Success', `Withdrawal request submitted!\n\nAmount: ${response.withdrawal.amount}\nFee: ${response.withdrawal.fee}\nNet Amount: ${response.withdrawal.netAmount}`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setSelectedBankAccount(null);
        loadWalletData();
      }
    } catch (error) {
      console.error('❌ Withdrawal request error:', error);
      const errorMessage = error.message || 'Failed to request withdrawal';
      Alert.alert('Withdrawal Error', errorMessage);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId) => {
    Alert.alert(
      'Cancel Withdrawal',
      'Are you sure you want to cancel this withdrawal request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const response = await makeAuthenticatedRequest(CANCEL_WITHDRAWAL_API, {
                method: 'POST',
                body: JSON.stringify({ withdrawalId })
              });
              if (response.success) {
                Alert.alert('Success', 'Withdrawal cancelled and points refunded');
                loadWalletData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel withdrawal');
            }
          }
        }
      ]
    );
  };

  const formatAmount = (amount) => {
    if (typeof amount === 'string') return amount;
    return `${(amount / 100).toFixed(2)} pts`;
  };

  const getTransactionIcon = (type) => {
    const icons = {
      REDEEMED_VOUCHER: 'gift-outline',
      EARNED_TRASH: 'recycle',
      ADMIN_PAYMENT: 'cash-plus',
      BONUS: 'gift',
      ADMIN_ADJUSTMENT: 'tune'
    };
    return icons[type] || 'cash';
  };

  const getTransactionColor = (isCredit) => {
    return isCredit ? '#10B981' : '#EF4444';
  };

  const getStatusBadgeType = (status) => {
    const statusColors = {
      PENDING: { bg: '#FEF3C7', text: '#F59E0B' },
      APPROVED: { bg: '#D1FAE5', text: '#10B981' },
      PROCESSING: { bg: '#E0E7FF', text: '#6366F1' },
      COMPLETED: { bg: '#D1FAE5', text: '#059669' },
      REJECTED: { bg: '#FEE2E2', text: '#EF4444' },
      CANCELLED: { bg: '#F3F4F6', text: '#6B7280' }
    };
    return statusColors[status] || statusColors.PENDING;
  };

  // Render Balance Tab
  const renderBalanceTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Balance Card */}
      <LinearGradient
        colors={['#338b93', '#b6f492']}
        style={styles.balanceCard}
      >
        <Icon name="wallet-outline" size={56} color="#FFFFFF" style={{ marginBottom: 16 }} />
        <Text style={styles.balanceLabel}>Available Points</Text>
        <Text style={styles.balanceAmount}>
          {walletBalance !== null ? formatAmount(walletBalance) : 'Loading...'}
        </Text>
        <Text style={styles.balanceSubtext}>Redeem points for exciting vouchers</Text>
      </LinearGradient>

      {/* Summary Stats */}
      {walletSummary && (
        <View style={styles.summaryContainer}>
          <Card style={styles.statCard}>
            <Icon name="trending-up" size={32} color="#10B981" style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>{formatAmount(walletSummary.totalEarned)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </Card>

          <Card style={styles.statCard}>
            <Icon name="gift-outline" size={32} color="#EF4444" style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>{formatAmount(walletSummary.totalSpent)}</Text>
            <Text style={styles.statLabel}>Total Redeemed</Text>
          </Card>
        </View>
      )}

      {/* Recent Activity */}
      {walletSummary?.recentActivity && walletSummary.recentActivity.length > 0 && (
        <Card style={{ marginHorizontal: 16, marginTop: 8 }}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={{ gap: 12, marginTop: 12 }}>
            {walletSummary.recentActivity.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: activity.amount > 0 ? '#ECFDF5' : '#FEF2F2' }
                ]}>
                  <Icon
                    name={getTransactionIcon(activity.type)}
                    size={20}
                    color={getTransactionColor(activity.amount > 0)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityDesc}>{activity.description}</Text>
                  <Text style={styles.activityTime}>{activity.timeAgo}</Text>
                </View>
                <Text style={[
                  styles.activityAmount,
                  { color: activity.amount > 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {activity.amount > 0 ? '+' : ''}{formatAmount(Math.abs(activity.amount))}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('AddTrashScreen')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="recycle" size={28} color="#10B981" />
            </View>
            <Text style={styles.quickActionText}>Add Trash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => setActiveTab('transactions')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F5F3FF' }]}>
              <Icon name="history" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              // Navigate to rewards/vouchers screen if available
              // navigation.navigate('RewardsScreen');
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="gift-outline" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Rewards</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Info Card */}
      <Card style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#F0FDF4' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="information" size={24} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669', marginBottom: 4 }}>
              Earn More Points
            </Text>
            <Text style={{ fontSize: 12, color: '#047857' }}>
              Add more trash to your cart and get rewarded with points for every collection!
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );

  // Render Transactions Tab
  const renderTransactionsTab = () => (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
      renderItem={({ item }) => (
        <Card style={styles.transactionCard}>
          <View style={[
            styles.transactionIcon,
            { backgroundColor: item.isCredit ? '#ECFDF5' : '#FEF2F2' }
          ]}>
            <Icon
              name={getTransactionIcon(item.type)}
              size={24}
              color={getTransactionColor(item.isCredit)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.transactionDesc}>{item.description}</Text>
            <Text style={styles.transactionTime}>{item.timeAgo}</Text>
            {item.reference && (
              <Text style={styles.transactionRef}>Ref: {item.reference}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[
              styles.transactionAmount,
              { color: item.isCredit ? '#10B981' : '#EF4444' }
            ]}>
              {item.isCredit ? '+' : '-'}{formatAmount(item.amount)}
            </Text>
            <Text style={styles.transactionBalance}>
              Balance: {formatAmount(item.balance)}
            </Text>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Icon name="history" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
        </Card>
      }
    />
  );

  // Render Bank Accounts Tab
  const renderBankAccountsTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
    >
      <TouchableOpacity
        style={styles.addBankBtn}
        onPress={() => setShowAddBankModal(true)}
      >
        <Icon name="plus-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.addBankBtnText}>Add Bank Account</Text>
      </TouchableOpacity>

      {bankAccounts.map((account) => (
        <Card key={account.id} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {account.bankName}
                </Text>
                {account.isPrimary && (
                  <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669' }}>PRIMARY</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>
                {account.accountTitle}
              </Text>
              <Text style={{ fontSize: 13, color: '#338b93', fontWeight: '600' }}>
                {account.accountNumber}
              </Text>
              {account.branchCode && (
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  Branch: {account.branchCode}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!account.isPrimary && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => handleSetPrimaryAccount(account.id)}
              >
                <Text style={styles.secondaryBtnText}>Set Primary</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.deleteBtn, { flex: 1 }]}
              onPress={() => handleDeleteBankAccount(account.id)}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      {bankAccounts.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Icon name="bank" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No bank accounts added</Text>
          <Text style={styles.emptySubtext}>Add a bank account to withdraw your points</Text>
        </Card>
      )}

      {/* Add Bank Modal */}
      <Modal visible={showAddBankModal} animationType="slide" onRequestClose={() => setShowAddBankModal(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddBankModal(false)}>
              <Icon name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Bank Account</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.inputLabel}>Account Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account title"
                  value={bankForm.accountTitle}
                  onChangeText={(text) => setBankForm({ ...bankForm, accountTitle: text })}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Account Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account number"
                  value={bankForm.accountNumber}
                  onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text })}
                  keyboardType="numeric"
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Bank Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., HBL, UBL, MCB"
                  value={bankForm.bankName}
                  onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Branch Code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter branch code"
                  value={bankForm.branchCode}
                  onChangeText={(text) => setBankForm({ ...bankForm, branchCode: text })}
                />
              </View>
            </View>
          </ScrollView>

          <View style={{ padding: 16 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddBankAccount}>
              <Icon name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Add Bank Account</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );

  // Render Withdrawals Tab
  const renderWithdrawalsTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
    >
      {withdrawalSettings && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Withdrawal Information
          </Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="cash-check" size={16} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: '#6B7280' }}>
                Minimum: {withdrawalSettings.minAmountDisplay}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="cash-multiple" size={16} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: '#6B7280' }}>
                Maximum: {withdrawalSettings.maxAmountDisplay}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="percent" size={16} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: '#6B7280' }}>
                Fee: {withdrawalSettings.feePercent}%
              </Text>
            </View>
          </View>
        </Card>
      )}

      <TouchableOpacity
        style={styles.withdrawBtn}
        onPress={() => {
          if (bankAccounts.length === 0) {
            Alert.alert('No Bank Account', 'Please add a bank account first');
            return;
          }
          setShowWithdrawModal(true);
        }}
      >
        <Icon name="bank-transfer-out" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.withdrawBtnText}>Request Withdrawal</Text>
      </TouchableOpacity>

      {withdrawals.map((withdrawal) => {
        const statusStyle = getStatusBadgeType(withdrawal.status);
        return (
          <Card key={withdrawal.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: statusStyle.text }}>
                    {withdrawal.status}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {withdrawal.amount}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Fee: {withdrawal.fee} • Net: {withdrawal.netAmount}
                </Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="bank" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                  {withdrawal.bankAccount.bankName} - {withdrawal.bankAccount.accountNumber}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="clock-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                  Requested: {withdrawal.timeAgo}
                </Text>
              </View>
            </View>

            {withdrawal.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.deleteBtn, { marginTop: 12 }]}
                onPress={() => handleCancelWithdrawal(withdrawal.id)}
              >
                <Text style={styles.deleteBtnText}>Cancel Withdrawal</Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      {withdrawals.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Icon name="bank-transfer" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No withdrawals yet</Text>
        </Card>
      )}

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} animationType="slide" onRequestClose={() => setShowWithdrawModal(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
              <Icon name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Withdrawal</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.inputLabel}>Select Bank Account</Text>
                {bankAccounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selectedBankAccount === account.id ? '#338b93' : '#E5E7EB',
                      backgroundColor: selectedBankAccount === account.id ? '#E0F2F1' : '#FFFFFF',
                      marginBottom: 10
                    }}
                    onPress={() => setSelectedBankAccount(account.id)}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      {account.bankName} - {account.accountNumber}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {account.accountTitle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View>
                <Text style={styles.inputLabel}>Amount (Points)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  keyboardType="numeric"
                />
                {withdrawalSettings && (
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                    Min: {withdrawalSettings.minAmountDisplay} • Max: {withdrawalSettings.maxAmountDisplay}
                  </Text>
                )}
              </View>

              {withdrawalSettings && withdrawAmount && (
                <Card style={{ backgroundColor: '#F9FAFB', padding: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                    Withdrawal Summary
                  </Text>
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Amount</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600' }}>
                        {parseFloat(withdrawAmount || 0).toFixed(2)} pts
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        Fee ({withdrawalSettings.feePercent}%)
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>
                        - {((parseFloat(withdrawAmount || 0) * withdrawalSettings.feePercent) / 100).toFixed(2)} pts
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Net Amount</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                        {(parseFloat(withdrawAmount || 0) - (parseFloat(withdrawAmount || 0) * withdrawalSettings.feePercent) / 100).toFixed(2)} pts
                      </Text>
                    </View>
                  </View>
                </Card>
              )}
            </View>
          </ScrollView>

          <View style={{ padding: 16 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestWithdrawal}>
              <Icon name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Submit Withdrawal Request</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {Platform.OS === 'android' && (
        <View style={{ height: RNStatusBar.currentHeight, backgroundColor: '#338b93' }} />
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 20, paddingVertical: 8, gap: 8 }}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balance' && styles.activeTab]}
          onPress={() => setActiveTab('balance')}
        >
          <Icon
            name="wallet-outline"
            size={16}
            color={activeTab === 'balance' ? '#338b93' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'balance' && styles.activeTabText]}>
            Balance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Icon
            name="history"
            size={16}
            color={activeTab === 'transactions' ? '#338b93' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'banks' && styles.activeTab]}
          onPress={() => setActiveTab('banks')}
        >
          <Icon
            name="bank"
            size={16}
            color={activeTab === 'banks' ? '#338b93' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'banks' && styles.activeTabText]}>
            Banks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'withdrawals' && styles.activeTab]}
          onPress={() => setActiveTab('withdrawals')}
        >
          <Icon
            name="bank-transfer-out"
            size={16}
            color={activeTab === 'withdrawals' ? '#338b93' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'withdrawals' && styles.activeTabText]}>
            Withdraw
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#338b93" />
        </View>
      ) : (
        <>
          {activeTab === 'balance' && renderBalanceTab()}
          {activeTab === 'transactions' && renderTransactionsTab()}
          {activeTab === 'banks' && renderBankAccountsTab()}
          {activeTab === 'withdrawals' && renderWithdrawalsTab()}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#338b93',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 50,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  activeTab: {
    backgroundColor: '#E0F2F1',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#338b93',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#338b93',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  transactionTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  transactionRef: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionBalance: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  // Button Styles
  addBankBtn: {
    backgroundColor: '#338b93',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  addBankBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  withdrawBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  withdrawBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryBtn: {
    backgroundColor: '#338b93',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: '#E0F2F1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#338b93',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
});

export default CustomerWalletScreen;
