import React, { useState } from "react";
import { Checkbox } from "react-native-paper";
import { View, Text, TextInput, Dimensions, StyleSheet, Image, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { authApi } from "@/services/auth-api";
import { usersApi } from "@/services/users-api";
import DecorativeSwoosh from "@/components/decorative-swoosh";

export default function LoginScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [keepLoggedIn, setKeepLoggedIn] = useState(false);
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(true);
    const styles = getStyles(theme);
    const { width: screenWidth } = Dimensions.get("window");

    const handleLogin = async () => {
        setMessage("");
        setLoading(true);

        try {
            const res = await authApi.login(username.trim(), password);
            if (!res.ok) {
                setMessage(res.message);
                return;
            }

            const me = await usersApi.me();
            if (!me.ok) {
                setMessage(me.message);
                return;
            }
            router.replace("tabs/home");
        }
        catch (error: any) {
            setMessage(error?.message || "Network error. Please try again.");
            console.error("Login error:", error?.response?.data || error);
        }
        finally {
            setLoading(false);
        }
    };

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
                    source={require("../assets/images/logo.png")}
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

                {/* Message placeholder for errors */}
                {message ? (
                    <Text style={[styles.message, isError ? styles.errorText : styles.successText]}>
                        {message}
                    </Text>
                ) : null}

                <Pressable
                    style={[styles.loginButton, loading && { opacity: 0.6 }]}
                    disabled={loading}
                    onPress={() => {
                        if (!username || !password) {
                            setIsError(true);
                            setMessage("Please fill out all fields.");
                        } else {
                            handleLogin();
                        }
                    }}
                >
                    {loading ? <ActivityIndicator /> : <Text style={styles.loginText}>Log In</Text>}
                </Pressable>

                <Pressable onPress={() => router.push("./register")}>
                    <Text style={styles.link}>Create an account!</Text>
                </Pressable>
                <Pressable onPress={() => router.push("./forgot-pass")}>
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
            padding: 0,
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
            marginBottom: 25,
            marginLeft: -14,
            width: "100%", // make the row full width so contents can align to the left edge
            justifyContent: 'flex-start',
        },
        checkboxLabel: {
            color: theme.text,
            fontSize: 12,
        },
        // Message styles (centered and consistent)
        message: {
            width: "100%",
            marginTop: 0,
            marginBottom: 0,
            fontSize: 13,
            textAlign: "center",
            paddingHorizontal: 4,
            alignSelf: 'center',
            minHeight: 20,
        },
        errorText: {
            color: "red",
        },
        successText: {
            color: "green",
        },
        loginButton: {
            backgroundColor: theme.border,
            borderRadius: 5,
            marginTop: 12,
            paddingVertical: 8,
            paddingHorizontal: 24,
            marginBottom: 12,
        },
        loginText: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.background,
        },
        link: {
            fontSize: 14,
            color: theme.border,
            textDecorationLine: "underline",
            marginTop: 4,
        },
    });
}
