// app/forgot-password.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    Dimensions,
    Platform,
    StatusBar,
    TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeSwoosh from "@/components/decorative-swoosh";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const { theme } = useTheme();
    const router = useRouter();

    // Screen width for responsive sizing
    const { width: screenWidth } = Dimensions.get("window");
    const fontSize = 20; // Base font size for the back arrow

    const insets = useSafeAreaInsets();

    const handleRecover = () => {
        console.log("Recover password for:", email);
        router.replace("/login");
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
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

            {/* Main content */}
            <View style={[styles.container]}>
                <Text style={[styles.title, { color: theme.text }]}>Recover Account</Text>

                <Text style={[styles.instructions, { color: theme.text }]}>
                    Enter your email address, and we’ll send you a link to reset your password.
                </Text>

                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: theme.inputBackground,
                            borderColor: theme.border,
                            color: theme.text,
                        },
                    ]}
                    placeholder="Email"
                    placeholderTextColor={theme.primary}
                    value={email}
                    onChangeText={setEmail}
                />

                <Pressable
                    style={[styles.button, { backgroundColor: theme.primary }]}
                    onPress={handleRecover}
                >
                    <Text style={[styles.buttonText, { color: theme.text }]}>Send Link</Text>
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
    title: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 20,
    },
    instructions: {
        fontSize: 12,
        textAlign: "center",
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    backButton: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
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
        marginTop: 10,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: "500",
    },
});
