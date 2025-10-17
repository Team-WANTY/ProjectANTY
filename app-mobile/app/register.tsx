// app/register.tsx
import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Dimensions, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi } from "@/services/auth-api";
import DecorativeSwoosh from "@/components/decorative-swoosh";

export default function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const { theme } = useTheme(); // get theme values
    const router = useRouter();
    const fontSize = 20; // Base font size for the back arrow
    const { width: screenWidth } = Dimensions.get("window");
    const insets = useSafeAreaInsets();
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(true);
    const [loading, setLoading] = useState(false);
    const redirectTimer = useRef<NodeJS.Timeout | null>(null);

    // cleanup timer on unmount/cancel
    useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current)};
    }, []);

    const handleRegister = async () => { 
        setMessage("");
        setLoading(true);

        if (!username.trim() || !password || !email.trim() || !passwordConfirm) {
            setMessage("Please enter in all fields");
            return;
        }
        if (password !== passwordConfirm) {
            setMessage("Passwords do not match");
            return;
        }

        try {    
            const result = await authApi.register(
                email.trim().toLowerCase(),
                username.trim(),
                password
            );
            if(!result.ok) {
                setMessage(result.message || "Registration failed");
                setLoading(false);
                return;
            }
            setIsError(false);
            if (redirectTimer.current) clearTimeout(redirectTimer.current);
            setMessage("Account registered successfully! Redirecting to login page…");
            redirectTimer.current = setTimeout(() => {
                router.replace("/login");
            }, 2000);
        } 
        catch (error: any) {
            console.error(error.response?.data || error.message);
            setMessage(error?.message || "Unexpected error");
        }
        finally {
            setLoading(false);
        }
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
                <TouchableOpacity style={[styles.backButton, { top: insets.top + 15 }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.background}
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
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                placeholder="Email Address"
                placeholderTextColor={theme.primary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />

            <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                placeholder="Username"
                placeholderTextColor={theme.primary}
                value={username}
                onChangeText={setUsername}
            />

            <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                placeholder="Password"
                placeholderTextColor={theme.primary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.primary}
                secureTextEntry
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
            />

<<<<<<< HEAD
            {errorMsg   ? (<Text style={[styles.message, styles.errorText]}> {errorMsg} </Text>) : null}
            {successMsg ? (<Text style={[styles.message, styles.successText]}> {successMsg} </Text>) : null}
=======
            {message ? (<Text style={[styles.message, isError ? styles.errorText : styles.successText]}>{message}</Text>) : null}
>>>>>>> 7b9d460 (restructure & decoupled auth & user API)
            
            <Pressable
                style={[styles.button, loading && { opacity: 0.6 }, { backgroundColor: theme.primary }]}
                disabled={loading}
                onPress={() => {
                    // Quick pre-submit validation (mirrors handleRegister checks for instant feedback)
                    if (!username.trim() || !password || !email.trim() || !passwordConfirm) {
                        setErrorMsg("Please enter in all fields");
                        return;
                    }
                    const emailTrimmed = email.trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(emailTrimmed)) {
                        setErrorMsg("Please enter a valid email address");
                        return;
                    }
                    if (password !== passwordConfirm) {
                        setErrorMsg("Passwords do not match");
                        return;
                    }

                    // Clear client-side error and proceed
                    setErrorMsg(null);
                    handleRegister();
                }}
            >
                {loading ? <ActivityIndicator /> : <Text style={[styles.buttonText, { color: theme.text }]}>Register</Text>}
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
    message: {
<<<<<<< HEAD
        width: "100%",
        marginTop: 0,
        marginBottom: 0,
        fontSize: 12,
        textAlign: "center",
        paddingHorizontal: 4,
        alignSelf: 'center',
        minHeight: 20,
=======
        marginTop: 10,
        fontSize: 14,
        textAlign: "center",
>>>>>>> 7b9d460 (restructure & decoupled auth & user API)
    },
    errorText: {
        color: "red",
    },
    successText: {
        color: "green",
    },
});
