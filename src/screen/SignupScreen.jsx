import { StyleSheet, Text, TextInput, TouchableOpacity, View, Image, SafeAreaView, StatusBar } from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "@utils/colors.js";
import { fonts } from "@utils/fonts.js";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import SimpleLineIcons from "react-native-vector-icons/SimpleLineIcons";
import { REGISTER_API } from "../config";
import PasswordStrengthMeterBar from 'react-native-password-strength-meter-bar';
import { LinearGradient } from "expo-linear-gradient";

const SignupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Extract role information from navigation params if available
  const roleType = route.params?.roleType || "Customer"; // Default to Customer if no role specified
  const roleColor = route.params?.roleColor || "#4CD964"; // Default green if no color specified
  const roleBgColor = route.params?.roleBgColor || "#f0faf0"; // Default light green if no bg color specified
  
  const [secureEntry, setSecureEntry] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (!username || !email || !password || !confirmPassword) {
      alert("Please fill all fields!");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
    if (!strongPasswordPattern.test(password)) {
      alert("Password must contain at least one uppercase letter, one lowercase letter, and one special character.");
      return;
    }

    // Include the role in the data being sent to the server
    const data = {
      name: username,
      email: email,
      password: password,
      role: roleType // Add role to the signup data
    };

    try {
      const response = await fetch(`${REGISTER_API}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Backend response:", result);

      if (response.ok) {
        alert("Signup successful! Redirecting to OTP verification.");
        navigation.navigate("VerifyOtp", { email, flag: 1, role: roleType });
      } else {
        if (result.email === "customers with this email already exists.") {
          alert("This email is already registered with another account.");
        } else if (result.username === "customers with this username already exists.") {
          alert("This username is already taken.");
        } else {
          alert(result.email || "Signup failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error during signup:", error);
      alert("An error occurred. Please try again later.");
    }
  };

  // Modified handleLogin function to navigate to different login screens based on role
  const handleLogin = () => {
    // Navigate to the appropriate login screen based on the selected role
    switch(roleType) {
      case "Ragman":
        navigation.navigate("RagmanLogin");
        break;
      case "Rider":
        navigation.navigate("RiderLogin");
        break;
      case "Customer":
      default:
        navigation.navigate("CustomerLoginScreen");
        break;
    }
  };

  // Determine gradient colors based on role
  const getGradientColors = () => {
    switch(roleType) {
      case "Customer":
        return ["#f0faf0", "#e0f5e0"]; // Light green gradient
      case "Ragman":
        return ["#E3E7FF", "#DCE2FF"]; // Light blue gradient
      case "Rider":
        return ["#F3E8FF", "#EEE0FF"]; // Light purple gradient
      default:
        return ["#f0faf0", "#e0f5e0"]; // Default light green gradient
    }
  };

  // Get button color based on role
  const getButtonColor = () => {
    return roleColor;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={roleBgColor} barStyle="dark-content" />
      
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Back Button */}
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: roleColor }]}>{"<"}</Text>
          </TouchableOpacity>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require("@assets/logo.png")} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View style={styles.textContainer}>
            <Text style={[styles.headingText, { color: roleColor }]}>Let's get</Text>
            <Text style={[styles.headingText, { color: roleColor }]}>started</Text>
          </View>
          
          {/* Role Indicator */}
          <View style={[styles.roleIndicator, { backgroundColor: roleColor + '20' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>
              Signing up as <Text style={styles.roleBold}>{roleType}</Text>
            </Text>
          </View>
      
          {/* Form */}
          <View style={styles.formContainer}>
            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Ionicons name={"person-outline"} size={22} color="#888888" />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your username"
                placeholderTextColor="#888888"
                value={username}
                onChangeText={(text) => setUsername(text)}
              />
            </View>
      
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name={"mail-outline"} size={22} color="#888888" />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor="#888888"
                value={email}
                onChangeText={(text) => setEmail(text)}
                keyboardType="email-address"
              />
            </View>
      
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <SimpleLineIcons name="lock" size={22} color="#888888" />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#888888"
                value={password}
                onChangeText={(text) => setPassword(text)}
                secureTextEntry={secureEntry}
              />
              <TouchableOpacity onPress={() => setSecureEntry((prev) => !prev)}>
                <Ionicons
                  name={secureEntry ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#888888"
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Strength Meter */}
            {password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <PasswordStrengthMeterBar
                  password={password}
                  showLabels
                  labelStyle={styles.passwordStrengthLabel}
                  barContainerStyle={styles.passwordStrengthBarContainer}
                  barStyle={styles.passwordStrengthBar}
                />
              </View>
            )}
            
            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <SimpleLineIcons name="lock" size={22} color="#888888" />
              <TextInput
                style={styles.textInput}
                placeholder="Confirm your password"
                placeholderTextColor="#888888"
                value={confirmPassword}
                onChangeText={(text) => setConfirmPassword(text)}
                secureTextEntry={secureEntry}
              />
              <TouchableOpacity onPress={() => setSecureEntry((prev) => !prev)}>
                <Ionicons
                  name={secureEntry ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#888888"
                />
              </TouchableOpacity>
            </View>

            {/* Sign Up Button */}
            <LinearGradient
              colors={[getButtonColor(), getButtonColor()]}
              style={styles.signupButton}
            >
              <TouchableOpacity onPress={handleSignup} style={styles.signupButtonInner}>
                <Text style={styles.signupButtonText}>Sign Up</Text>
              </TouchableOpacity>
            </LinearGradient>
      
            {/* Continue with Google */}
            <Text style={styles.continueText}>or continue with</Text>
            <TouchableOpacity style={styles.googleButtonContainer}>
              <Image 
                source={require("@assets/google.png")} 
                style={styles.googleImage} 
              />
              <Text style={styles.googleText}>Google</Text>
            </TouchableOpacity>
      
            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={[styles.loginText, { color: roleColor }]}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0faf0",
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 20,
    width: 40,
  },
  backButtonText: {
    fontSize: 24,
    fontFamily: fonts.SemiBold,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  logo: {
    width: 80,
    height: 80,
  },
  textContainer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  headingText: {
    fontSize: 32,
    fontFamily: fonts.SemiBold,
    lineHeight: 40,
  },
  roleIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 14,
    fontFamily: fonts.Regular,
  },
  roleBold: {
    fontFamily: fonts.Bold,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontFamily: fonts.Regular,
    fontSize: 14,
    color: "#333333",
  },
  passwordStrengthContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  passwordStrengthLabel: {
    color: "#888888",
    fontSize: 12,
    fontFamily: fonts.Regular,
    marginBottom: 4,
  },
  passwordStrengthBarContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EEEEEE",
  },
  passwordStrengthBar: {
    height: 6,
    borderRadius: 3,
  },
  signupButton: {
    borderRadius: 100,
    marginTop: 10,
    marginBottom: 20,
    overflow: "hidden",
  },
  signupButtonInner: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
  },
  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: fonts.SemiBold,
    textAlign: "center",
  },
  continueText: {
    textAlign: "center",
    marginVertical: 16,
    fontSize: 14,
    fontFamily: fonts.Regular,
    color: "#888888",
  },
  googleButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 10,
  },
  googleImage: {
    height: 24,
    width: 24,
  },
  googleText: {
    fontSize: 16,
    fontFamily: fonts.SemiBold,
    color: "#333333",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 5,
  },
  footerText: {
    color: "#888888",
    fontFamily: fonts.Regular,
    fontSize: 14,
  },
  loginText: {
    fontFamily: fonts.Bold,
    fontSize: 14,
  },
});