// app/change-email.tsx
import { View, Text, TextInput, Dimensions, Pressable, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserStore } from "@/services/stores/users-store";
import { usersApi } from "@/services/api/users-api";

export default function ChangeEmail() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get("window");
  const fontSize = 20; // back-arrow base

  const [newEmail, setNewEmail] = useState("");
  const [isError, setIsError] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const userID = useUserStore(s => s.userId);

  const handleChangeEmail = async () => {
    if (!userID) {
      setMessage("Missing user id.");
      return;
    }
    setMessage("");
    setIsError(true);
    setLoading(true);

    try {

      const res = await usersApi.update({ id: userID, email: newEmail });
      if (!res.ok) {
        setMessage(res.message ?? "Password change failed.");
        return;
      }
      useUserStore.getState().setUser({ email: newEmail });
      console.log("Email changed successful");
      setIsError(false);
      setMessage("Email changed successful");
      setTimeout(() => router.replace("/login"), 800);
    } catch {
      setMessage("Error: Failed to change email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
            color={theme.onBackground}
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { left: 8, top: 10, width: fontSize * 1.5, height: fontSize * 1.5 },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Change Email</Text>

        <Text style={[styles.instructions, { color: theme.text }]}>
          Enter and confirm your new email.
        </Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.onBackground },
          ]}
          placeholder="New email"
          placeholderTextColor={theme.primary}
          value={newEmail}
          onChangeText={setNewEmail}
          secureTextEntry
        />


        {message ? (
          <Text style={[styles.message, isError ? styles.errorText : styles.successText]}>{message}</Text>
        ) : null}

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }, { backgroundColor: theme.primary }]}
          disabled={loading}
          onPress={() => {
            if (!newEmail) {
              setMessage("Please enter your new email.");
              return;
            }
            const emailTrimmed = newEmail.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailTrimmed.trim() && !emailRegex.test(emailTrimmed)) {
              setMessage("Please enter a valid email address");
              // newFieldErrors.email = true;
            }
            handleChangeEmail();
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
