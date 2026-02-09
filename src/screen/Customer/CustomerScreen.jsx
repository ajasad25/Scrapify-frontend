import React, { useState, useRef, useContext } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  PanResponder,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors } from "@utils/colors";
import { fonts } from "@utils/fonts";
import { AuthContext } from "../../context/AuthContext";
import { LOGIN_API } from "../../config";

const LoginScreen = () => {
  const navigation = useNavigation();
  const { setIsAuthenticated } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureEntry, setSecureEntry] = useState(true);
  const panAnim = useRef(new Animated.Value(0)).current;

    const handleLogin = async () => {
        if (!email || !password) {
          alert("Please enter both email and password!");
          return;
        }

        const data = {
          email,
          password,
          role: 'CUSTOMER' // Add role parameter for Customer login
        };

        try {
          const response = await fetch(`${LOGIN_API}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          const result = await response.json();

console.log("DEBUG: Login result from backend:", result);

          if (response.ok) {
            const token = result.token;
            const uname = result.username;
            const email = result.email;
            const userId = result.user?.id || result.userId || result.id;
            console.log("DEBUG: Extracted userId:", userId);
            console.log("DEBUG: Full user object:", result.user);

            if (!userId) {
              console.error("ERROR: Could not extract userId from login response!");
              alert("Login error: User ID not found. Please contact support.");
              return;
            }

            await AsyncStorage.setItem("@jwt_token", token);
            await AsyncStorage.setItem("@uname", uname);
            await AsyncStorage.setItem("@email", email);
            await AsyncStorage.setItem("@user_id", String(userId)); // <-- save user id as string
            console.log("DEBUG: Saved user_id to AsyncStorage:", String(userId));
            setIsAuthenticated(true);
            navigation.navigate("AddTrashScreen");
          } else {
            // Show backend error messages (401: Invalid credentials, 403: Wrong portal)
            alert(result.detail || result.message || "Login failed. Please check your credentials and try again.");
          }
        } catch (error) {
          console.error("Error during login:", error);
          alert("An error occurred. Please try again later.");
        }
      };


 const handleSignup = () => navigation.navigate("CheckRole");
  const handleForgetPassword = () => navigation.navigate("ForgetPassword");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dx > 5 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_, gestureState) => {
        panAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          Animated.timing(panAnim, {
            toValue: 300,
            duration: 100,
            useNativeDriver: true,
          }).start(() => navigation.goBack());
        } else {
          Animated.timing(panAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <LinearGradient
      colors={["#b6f492", "#338b93"]}
      style={styles.gradientBackground}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {Platform.OS === "android" && (
        <View style={{ height: RNStatusBar.currentHeight }} />
      )}

      <Animated.View
        style={[styles.container, { transform: [{ translateX: panAnim }] }]}
        {...panResponder.panHandlers}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Image
            source={require("@assets/logo.png")}
            style={styles.logo}
            contentFit="contain"
          />

          {/* Welcome Text */}
          <Text style={styles.welcomeTitle}>Hello.</Text>
          <Text style={styles.welcomeSub}>
            Welcome <Text style={styles.boldText}>Customer!</Text>
          </Text>

          {/* Sign In Label */}
          <Text style={styles.signInLabel}>Sign in</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="E-mail or username"
              placeholderTextColor="#555"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor="#555"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureEntry}
            />
            <TouchableOpacity onPress={() => setSecureEntry(!secureEntry)}>
              <Ionicons
                name={secureEntry ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#555"
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={handleForgetPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          

          {/* Footer */}
          <Text style={styles.footer}>Scrapify Inc. © 2025</Text>
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: "center",
  },
  logo: {
    width: 90,
    height: 90,
    alignSelf: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 34,
    fontFamily: fonts.Bold,
    color: "#000",
    textAlign: "center",
  },
  welcomeSub: {
    fontSize: 18,
    fontFamily: fonts.Regular,
    color: "#000",
    textAlign: "center",
    marginBottom: 30,
  },
  boldText: {
    fontFamily: fonts.Bold,
  },
  signInLabel: {
    fontSize: 18,
    fontFamily: fonts.SemiBold,
    marginBottom: 15,
    color: "#000",
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderColor: "#333",
    marginBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#000",
    fontFamily: fonts.Regular,
  },
  forgotPasswordText: {
    textAlign: "right",
    color: "#333",
    fontFamily: fonts.SemiBold,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#00C853",
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 15,
  },
  loginButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontFamily: fonts.Bold,
  },
 
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#333",
    marginTop: 30,
    fontFamily: fonts.Regular,
  },
});
