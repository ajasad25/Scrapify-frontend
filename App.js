import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StripeProvider } from "@stripe/stripe-react-native";

// Screens
import GettingStartedScreen from "./src/screen/StartupScreen.jsx";
import AddTrashScreen from "./src/screen/Customer/AddTrashScreen.jsx";
import SignupScreen from "./src/screen/SignupScreen.jsx";
import CustomerLoginScreen from "./src/screen/Customer/CustomerScreen.jsx";
import OnboardingScreen from "./src/screen/Onboarding.jsx";
import RiderPortal from "./src/screen/Rider/RiderPortal.jsx";
import JoinScrapify from "./src/screen/JoinScrapify.jsx";
import RiderLogin from "./src/screen/Rider/RiderLogin.jsx"
import RagmanLogin from "./src/screen/Ragman/RagmanLogin.jsx";
import RagmanPortal from "./src/screen/Ragman/RagmanPortal.jsx";
import SubscriptionScreen from "./src/screen/Ragman/SubscriptionScreen.jsx";
import VerificationScreen from "./src/screen/Ragman/VerificationScreen.jsx";
import VerifyOtp from "./src/screen/VerifyOtpScreen.jsx";
import TrashDetailScreen from "./src/screen/Customer/TrashDetailScreen.jsx";
import CheckOrderScreen from "./src/screen/Customer/CheckOrderScreen.jsx";
import ForgetPassword from "./src/screen/ForgetPasswordScreen.jsx";
import ResetPassword from "./src/screen/ResetPasswordScreen.jsx";
import CartScreen from "./src/screen/Customer/CartScreen.jsx";
import RiderProfileScreen from "./src/screen/Rider/RiderProfileScreen.jsx";
import PaymentScreen from "./src/screen/Ragman/PaymentScreen.jsx";
// Auth Context
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigationController from "./src/screen/Ragman/AppNavigationController.jsx";
//import RagmanPremium from "./src/screen/Ragman/RagmanPremium.jsx";
import RagmanPremium from "./src/screen/Ragman/RagmanPremium.jsx";

// Stripe publishable key - Replace with your actual key from Stripe Dashboard
const STRIPE_PUBLISHABLE_KEY = "pk_test_51RtzjoR51VdCYWgzRfkHgdVSUf8fEVhVN1JCGj8iRxXwkD3l6Cm4bdPM6UCkE5VFbi4qwrPoGlxS9ml3wJApdypR001z9q1rv9";

// Fix: Change to default import (remove curly braces)
import ProfileScreen from "./src/screen/Customer/ProfileScreen.jsx";
import MyRequestsScreen from "./src/screen/Customer/MyRequestsScreen.jsx";
import ChatScreen from "./src/screen/Customer/ChatScreen.jsx";
import CustomerWalletScreen from "./src/screen/Customer/CustomerWalletScreen.jsx";
import RagmanChatScreen from "./src/screen/Ragman/RagmanChatScreen.jsx";
import RiderAssignmentsScreen from './src/screen/Rider/RiderAssignmentsScreen';
import RiderHistoryScreen from './src/screen/Rider/RiderHistoryScreen';
import RiderTrackAssignScreen from './src/screen/Rider/RiderTrackAssignScreen';



const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="GettingStarted"
            screenOptions={{ headerShown: false }}
          >
            {/* Global screens */}
            <Stack.Screen name="GettingStarted" component={GettingStartedScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="JoinScrapify" component={JoinScrapify}/>
            <Stack.Screen name="VerifyOtp" component={VerifyOtp}/>
            <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
            <Stack.Screen name="ResetPassword" component={ResetPassword} />
            {/* Fix: Change Stack.screen to Stack.Screen (capital S) */}
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />

            {/* Role-based logins */}
            <Stack.Screen name="CustomerLoginScreen" component={CustomerLoginScreen} />
            <Stack.Screen name="AddTrashScreen" component={AddTrashScreen} />
            <Stack.Screen name="TrashDetailScreen" component={TrashDetailScreen} />
            <Stack.Screen name="CheckOrderScreen" component={CheckOrderScreen} />
            <Stack.Screen name="CartScreen" component={CartScreen} />
            <Stack.Screen name="MyRequestsScreen" component={MyRequestsScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="CustomerWalletScreen" component={CustomerWalletScreen} />

            {/* Role-based logins */}
            <Stack.Screen name="RagmanPortal" component={RagmanPortal} />
            <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
            <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />
            <Stack.Screen name="RagmanLogin" component={RagmanLogin} />
            <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
            <Stack.Screen name="AppNavigationController" component={AppNavigationController} />
            <Stack.Screen name="RagmanChatScreen" component={RagmanChatScreen} />



            {/* Role-based logins */}
            <Stack.Screen name="RiderPortal" component={RiderPortal} />
            <Stack.Screen name="RiderLogin" component={RiderLogin} />
            <Stack.Screen name="RiderProfileScreen" component={RiderProfileScreen} />
            <Stack.Screen name="RiderAssignmentsScreen" component={RiderAssignmentsScreen} />
            <Stack.Screen name="RiderHistoryScreen" component={RiderHistoryScreen} />
            <Stack.Screen name="RiderTrackAssignScreen" component={RiderTrackAssignScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </StripeProvider>
  );
}