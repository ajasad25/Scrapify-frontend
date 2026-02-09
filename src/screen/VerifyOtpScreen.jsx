import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from "react-native";
import { colors } from "../utils/colors";
import { fonts } from "../utils/fonts";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { OTP_API, FORGOT_PASSWORD_API } from "../config";

const VerifyOtpScreen = ({ route, navigation }) => {
  const { email, flag } = route.params;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const inputRefs = Array(6).fill(0).map(() => React.createRef());

  const handleOtpChange = (text, index) => {
    if (text.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      if (text.length === 1 && index < 5) {
        inputRefs[index + 1].current.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && !otp[index]) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const data = {
      email: email,
      otp: otpValue,
    };

    const API_URL = flag === 1 ? OTP_API : FORGOT_PASSWORD_API;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setIsVerified(true);
        Alert.alert(
          "Success",
          "Your email has been verified successfully!",
          [
            {
              text: "Continue",
              onPress: () => {
                if (flag === 1) {
                  navigation.navigate("JoinScrapify");
                } else if (flag === 0) {
                  navigation.navigate("ResetPassword", { email });
                }
              },
            },
          ]
        );
      } else {
        setErrorMessage(result.detail || "OTP verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during OTP verification:", error);
      setErrorMessage("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const API_URL = flag === 1 ? OTP_API : FORGOT_PASSWORD_API;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("OTP Resent", "A new OTP has been sent to your email.");
      } else {
        Alert.alert("Error", result.detail || "Failed to resend OTP.");
      }
    } catch (error) {
      console.error("Resend OTP Error:", error);
      Alert.alert("Error", "Something went wrong. Try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : null}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={require("@assets/lock.png")} style={styles.lockImage} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.headingText}>Verify your OTP</Text>
          <Text style={styles.subHeadingText}>
            Enter the 6-digit code sent to your email
          </Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={inputRefs[index]}
              style={styles.otpInput}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {isVerified && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={24} color={colors.green} />
            <Text style={styles.successText}>Your email is verified!</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Didn't receive the code?</Text>
          <TouchableOpacity onPress={handleResendOtp}>
            <Text style={styles.resendText}> Resend OTP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default VerifyOtpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  lockImage: {
    height: 100,
    width: 100,
    borderRadius: 50,
    backgroundColor: colors.lightGray,
    padding: 10,
  },
  textContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  headingText: {
    textAlign: "center",
    fontSize: 28,
    color: colors.primary,
    fontFamily: fonts.SemiBold,
    marginBottom: 15,
  },
  subHeadingText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: fonts.Regular,
    textAlign: "center",
  },
  emailText: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: fonts.SemiBold,
    marginTop: 8,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 30,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    fontFamily: fonts.SemiBold,
    backgroundColor: colors.lightGray,
  },
  errorText: {
    color: colors.red,
    fontFamily: fonts.Regular,
    textAlign: "center",
    marginBottom: 10,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successText: {
    color: colors.green,
    fontFamily: fonts.SemiBold,
    marginLeft: 8,
    fontSize: 16,
  },
  verifyButton: {
    backgroundColor: colors.but,
    borderRadius: 50,
    paddingVertical: 15,
    marginTop: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.SemiBold,
    textAlign: "center",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  footerText: {
    color: colors.primary,
    fontFamily: fonts.Regular,
  },
  resendText: {
    color: colors.blue,
    fontFamily: fonts.Bold,
  },
});
