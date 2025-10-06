import React, { useState } from "react";
import { Checkbox } from "react-native-paper";
import { View, Text, TextInput, Dimensions, StyleSheet, Image, Pressable } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";

import DecorativeSwoosh from "@/components/decorative-swoosh";

export default function LoginScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [keepLoggedIn, setKeepLoggedIn] = useState(false);

    const styles = getStyles(theme);
    const { width: screenWidth } = Dimensions.get("window");

    return (
        <View style={styles.container}>
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
            </View>

            <View style={styles.card}>
                <Image
                    source={require("../assets/images/react-logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Sign In</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={theme.border}
                    value={username}
                    onChangeText={setUsername}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={theme.border}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <View style={styles.checkboxRow}>
                    <Checkbox
                        status={keepLoggedIn ? "checked" : "unchecked"}
                        onPress={() => setKeepLoggedIn(!keepLoggedIn)}
                        color={theme.primary} // active color
                        uncheckedColor={theme.border} // inactive border color
                    />
                    <Text style={styles.checkboxLabel}>Keep me logged in</Text>
                </View>

                <Pressable
                    style={styles.loginButton}
                    onPress={() => router.replace("./(tabs)/home")}
                >
                    <Text style={styles.loginText}>Log In</Text>
                </Pressable>

                <Pressable
                    onPress={() => router.push("./register")}>
                    <Text style={styles.link}>Create an account!</Text>
                </Pressable>
                <Pressable
                    onPress={() => router.push("./forgot-pass")}>
                    <Text style={styles.link}>Forgot Password?</Text>
                </Pressable>
            </View>
        </View>
    );
}

function getStyles(theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
        },
        card: {
            width: 220,
            padding: 20,
            backgroundColor: theme.background,
            borderRadius: 5,
            alignItems: "center",
        },
        logo: {
            width: 97,
            height: 97,
            marginBottom: 20,
        },
        title: {
            fontSize: 18,
            fontWeight: "700",
            color: theme.text,
            marginBottom: 20,
        },
        input: {
            width: "100%",
            height: 40,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 5,
            color: theme.text,
            paddingHorizontal: 10,
            marginBottom: 12,
            backgroundColor: theme.inputBackground,
        },
        checkboxRow: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
        },
        checkboxLabel: {
            color: theme.text,
            fontSize: 12,
            marginLeft: 8,
        },
        loginButton: {
            backgroundColor: theme.border,
            borderRadius: 5,
            paddingVertical: 8,
            paddingHorizontal: 24,
            marginBottom: 12,
        },
        loginText: {
            fontSize: 12,
            fontWeight: "500",
            color: theme.background,
        },
        link: {
            fontSize: 10,
            color: theme.border,
            textDecorationLine: "underline",
            marginTop: 4,
        },
    });
}
