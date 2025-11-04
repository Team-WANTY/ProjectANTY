// app/recovery.tsx
import { View, Text, TextInput, Dimensions, Pressable, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useState, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/services/api/auth-api";
import { Ionicons } from "@expo/vector-icons";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Recovery() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get("window");
  const fontSize = 20; // back-arrow base

  // Read the string in deep link
  const params = useLocalSearchParams();

  // Normalize the string
  const token = useMemo(() => {
    const raw = params?.token as string | string[] | undefined;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isError, setIsError] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleResetPassword = async () => {
    setMessage("");
    setIsError(true);
    setLoading(true);

    if (!token) {
      setMessage("Please open the link from your email again.");
      return;
    }

    try {
      const res = await authApi.resetPassword(token, newPassword);
      if (!res.ok) {
        setMessage(res.message ?? "Password reset failed.");
        return;
      }
      
      console.log("Password reset successful");
      setIsError(false);
      setMessage("Password reset successful");
      setTimeout(() => router.replace("/login"), 800);
    } catch {
      setMessage("Error: Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Top swoosh banner + Back Arrow (same behavior as forgot-password) */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: screenWidth,
          height: screenWidth * 0.495,
        }}
      >
        <DecorativeSwoosh color={theme.primary} width={screenWidth} height={screenWidth * 0.495} />
        <TouchableOpacity style={[styles.backButton, { top: insets.top + 15 }]}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.background}
            onPress={() => router.replace("/login")}
            style={[
              styles.backButton,
              { left: 8, top: 10, width: fontSize * 1.5, height: fontSize * 1.5 },
            ]}
          />
        </TouchableOpacity>
      </View>
      
      {/* Main Content */}
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Recover Account</Text>

        <Text style={[styles.instructions, { color: theme.text }]}>
          Enter and confirm your new password to finish resetting your account.
        </Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          placeholder="New password"
          placeholderTextColor={theme.primary}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          placeholder="Confirm new password"
          placeholderTextColor={theme.primary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {message ? (
          <Text style={[styles.message, isError ? styles.errorText : styles.successText]}>{message}</Text>
        ) : null}

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }, { backgroundColor: theme.primary }]}
          disabled={loading}
          onPress={() => {
            if (!newPassword || !confirmPassword) {
              setMessage("Please fill out both password fields.");
              return;
            }
            if (newPassword !== confirmPassword) {
              setMessage("Passwords do not match.");
              return;
            }

            handleResetPassword();
          }}
        >
          {loading ? <ActivityIndicator /> : <Text style={[styles.buttonText, { color: theme.text }]}>Submit</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  instructions: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 50,
  },
  input: {
    width: "70%",
    height: 45,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  message: {
    marginBottom: 8,
    fontSize: 13,
    textAlign: "center",
  },
  errorText: { color: "red" },
  successText: { color: "green" },
});
