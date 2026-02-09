import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { colors } from "../utils/colors";
import { fonts } from "../utils/fonts";
import { useNavigation } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { FORGOT_PASSWORD_API } from "../config";

const ForgetPassword = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetOtp = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${FORGOT_PASSWORD_API}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Something went wrong.");
      }

      const data = await response.json();

      if (data.message === "OTP sent to your email.") {
        Alert.alert("Success", data.message);
        navigation.navigate("VerifyOtp", { email, flag: 0 });
      } else {
        Alert.alert("Error", "Unexpected response from the server.");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Unable to connect to the server. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>{"<"}</Text>
      </TouchableOpacity>

      <View style={styles.illustrationContainer}>
        <ExpoImage
          source={require("@assets/forgot.gif")}
          style={styles.illustration}
        />
      </View>

      <Text style={styles.title}>Forgot Password?</Text>

      <TextInput
        style={styles.textInput}
        placeholder="Enter your email"
        value={email}
        onChangeText={(text) => setEmail(text)}
        placeholderTextColor={colors.ter}
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.resetButton} onPress={handleGetOtp}>
        <Text style={styles.resetButtonText}>
          {loading ? "Sending OTP..." : "Get OTP"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ForgetPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 20,
    justifyContent: "flex-start",
  },

  backButton: {
    marginTop: 40,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.primary,
    fontFamily: fonts.SemiBold,
  },

  title: {
    fontSize: 32,
    fontFamily: fonts.SemiBold,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 10,
  },

  textInput: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 100,
    paddingHorizontal: 20,
    marginVertical: 10,
    fontFamily: fonts.Light,
    height: 50,
  },

  resetButton: {
    backgroundColor: colors.but,
    borderRadius: 100,
    paddingVertical: 12,
    marginTop: 20,
  },

  resetButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.SemiBold,
    textAlign: "center",
  },

  backToLoginText: {
    color: colors.blue,
    fontFamily: fonts.SemiBold,
    textAlign: "center",
    marginTop: 20,
  },

  illustrationContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  illustration: {
    width: 250,
    height: 200,
    resizeMode: "contain",
    marginBottom: 30,
  },
});
