import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../utils/colors";
import { fonts } from "../utils/fonts";
import { useNavigation } from "@react-navigation/native";
import { RESET_PASSWORD_API } from "../config";


const ResetPasswordScreen = ({ route }) => { // Destructure route from props
  const navigation = useNavigation();
  const [secureEntry, setSecureEntry] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { email } = route.params; // Retrieve email from navigation parameters

  const handleResetPassword = async () => {
    // Check if the passwords match
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
  
    // Check if newPassword is not empty
    if (!newPassword) {
      alert("Please enter a new password.");
      return;
    }
  
    // Data to send to the API
    const data = {
      email: email, // email passed from route params
      new_password: newPassword,
    };
  
    try {
      // Make API call to reset the password
      const response = await fetch(`${RESET_PASSWORD_API}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
  
      const result = await response.json();
      console.log("Password reset response:", result);
  
      if (response.ok) {
        alert("Password reset successful.");
        navigation.navigate("JoinScrapify"); // Navigate to Login screen
      } else {
        // If response is not successful, show the error
        alert(result.detail || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("An error occurred. Please try again later.");
    }
  };
  

  const handleLogin = () => {
    navigation.navigate("JoinScrapify");
  };

  return (
    <View style={styles.container}>
      {/* Heading */}
      <View style={styles.headerContainer}>
        <Text style={styles.headingText}>Reset your password</Text>
        <Text style={styles.subHeadingText}>Choose a new password</Text>
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={24} color={colors.ter} />
        <TextInput
          style={styles.textInput}
          placeholder="Enter new password"
          placeholderTextColor={colors.ter}
          value={newPassword}
          onChangeText={(text) => setNewPassword(text)}
          secureTextEntry={secureEntry}
        />
        <TouchableOpacity onPress={() => setSecureEntry((prev) => !prev)}>
          <Ionicons
            name={secureEntry ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.ter}
          />
        </TouchableOpacity>
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={24} color={colors.ter} />
        <TextInput
          style={styles.textInput}
          placeholder="Confirm new password"
          placeholderTextColor={colors.ter}
          value={confirmPassword}
          onChangeText={(text) => setConfirmPassword(text)}
          secureTextEntry={secureEntry}
        />
        <TouchableOpacity onPress={() => setSecureEntry((prev) => !prev)}>
          <Ionicons
            name={secureEntry ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.ter}
          />
        </TouchableOpacity>
      </View>

      {/* Reset Password Button */}
      <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword}>
        <Text style={styles.resetButtonText}>Reset Password</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Remember your password?</Text>
        <TouchableOpacity onPress={handleLogin}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 20,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  headingText: {
    fontSize: 30,
    color: colors.primary,
    fontFamily: fonts.Bold,
  },
  subHeadingText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: fonts.Regular,
    textAlign: "center",
    marginTop: 10,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    fontFamily: fonts.Light,
  },
  resetButton: {
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 15,
    marginTop: 30,
  },
  resetButtonText: {
    color: colors.white,
    fontSize: 18,
    textAlign: "center",
    fontFamily: fonts.SemiBold,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: colors.secondary,
    fontFamily: fonts.Regular,
  },
  loginText: {
    fontSize: 14,
    color: colors.blue,
    fontFamily: fonts.Bold,
    marginLeft: 5,
  },
});
