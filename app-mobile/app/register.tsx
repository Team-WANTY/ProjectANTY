// app/register.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Dimensions, TouchableOpacity, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeSwoosh from "@/components/decorative-swoosh";

export default function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const { theme } = useTheme(); // get theme values
    const router = useRouter();
    const fontSize = 20; // Base font size for the back arrow
    const { width: screenWidth } = Dimensions.get("window");
    const insets = useSafeAreaInsets();

    const handleRegister = () => {
        // TODO: registration logic
        router.replace("/login");
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Top swoosh banner */}
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
                {/* Back Arrow */}
                <TouchableOpacity style={[styles.backButton, { top: insets.top + 15 }]}>
                    <Ionicons name="arrow-back"
                        size={24} color={theme.background}
                        onPress={() => router.back()}
                        style={[
                            styles.backButton,
                            {
                                left: 8,
                                top: 10,
                                width: fontSize * 1.5,
                                height: fontSize * 1.5,
                            },
                        ]} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>

            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
                ]}
                placeholder="Username"
                placeholderTextColor={theme.primary}
                value={username}
                onChangeText={setUsername}
            />

            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
                ]}
                placeholder="Password"
                placeholderTextColor={theme.primary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
                ]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.primary}
                secureTextEntry
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
            />

            <Pressable
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleRegister}
            >
                <Text style={[styles.buttonText, { color: theme.background }]}>Register</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    backButton: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 30,
    },
    input: {
        width: "100%",
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
        marginTop: 20,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: "500",
    },
});
