import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function Recovery() {
    const { theme } = useTheme();
    const { token } = useLocalSearchParams();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const router = useRouter();

    const handleResetPassword = async () => {
        if (!token) {
            alert("Error: No token provided.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Error: Passwords do not match.");
            return;
        }

        try {
            const response = await fetch("https://your-backend.com/api/confirm-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });
            if (response.ok) {
                alert("Password reset successfully!");
                router.push("/login");
            } else {
                alert("Error: Invalid or expired token.");
            }
        } catch (error) {
            alert("Error: Failed to reset password.");
        }
    };

    return (
        <View style={[styles.outerContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.title, { color: theme.secondaryText, fontFamily: theme.fonts?.sans || "sans-serif" }]}>
                    Reset Password
                </Text>

                {/* {token ? (
                    <Text style={[styles.info, { color: theme.text }]}>Token: {token}</Text>
                ) : (
                    <Text style={[styles.error, { color: "red" }]}>No token provided</Text>
                )} */}

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.secondaryText }]}>New password</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                        placeholder="Enter new password"
                        placeholderTextColor={theme.secondaryText}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.secondaryText }]}>Confirm new password</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                        placeholder="Confirm new password"
                        placeholderTextColor={theme.secondaryText}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }]}
                    onPress={handleResetPassword}
                >
                    <Text style={[styles.submitButtonText, { color: theme.text }]}>Submit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    container: {
        width: "100%",
        maxWidth: 300,
        padding: 24,
        borderRadius: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 16,
    },
    info: {
        fontSize: 12,
        textAlign: "center",
        marginBottom: 16,
    },
    error: {
        fontSize: 12,
        textAlign: "center",
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: "500",
        marginBottom: 4,
    },
    input: {
        height: 40,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderRadius: 5,
    },
    submitButton: {
        height: 45,
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },
    submitButtonText: {
        fontSize: 14,
        fontWeight: "600",
    },
});