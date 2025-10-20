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
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; username?: boolean; password?: boolean; passwordConfirm?: boolean; }>({});
    const [loading, setLoading] = useState(false);
    const redirectTimer = useRef<any>(null);

    // cleanup timer on unmount/cancel
    useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current)};
    }, []);

    const handleRegister = async () => { 
        setMessage("");
        setLoading(true);
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

            <Text style={[styles.inputLabel, { color: theme.text }]}>Email</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: fieldErrors.email ? 'red' : theme.border, color: theme.text },
                ]}
                placeholder="Email Address"
                placeholderTextColor={theme.primary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(text) => { setEmail(text); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: false })); }}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Username</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: fieldErrors.username ? 'red' : theme.border, color: theme.text },
                ]}
                placeholder="Username"
                placeholderTextColor={theme.primary}
                value={username}
                onChangeText={(text) => { setUsername(text); if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: false })); }}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Password</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: fieldErrors.password ? 'red' : theme.border, color: theme.text },
                ]}
                placeholder="Password"
                placeholderTextColor={theme.primary}
                secureTextEntry
                value={password}
                onChangeText={(text) => { setPassword(text); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: false })); }}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Confirm Password</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme.inputBackground, borderColor: fieldErrors.passwordConfirm ? 'red' : theme.border, color: theme.text },
                ]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.primary}
                secureTextEntry
                value={passwordConfirm}
                onChangeText={(text) => { setPasswordConfirm(text); if (fieldErrors.passwordConfirm) setFieldErrors(prev => ({ ...prev, passwordConfirm: false })); }}
            />

            {message ? (<Text style={[styles.message, isError ? styles.errorText : styles.successText]}>{message}</Text>) : null}
            
            <Pressable
                style={[styles.button, loading && { opacity: 0.6 }, { backgroundColor: theme.primary }]}
                disabled={loading}
                onPress={() => {
                    // Quick pre-submit validation (mirrors handleRegister checks for instant feedback)
<<<<<<< HEAD
                    if (!username.trim() || !password || !email.trim() || !passwordConfirm) {
                        setMessage("Please enter in all fields");
                        return;
                    }
                    const emailTrimmed = email.trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(emailTrimmed)) {
                        setMessage("Please enter a valid email address");
                        return;
                    }
                    if (password !== passwordConfirm) {
                        setMessage("Passwords do not match");
=======
                    const newFieldErrors: any = {};
                    if (!username.trim()) newFieldErrors.username = true;
                    if (!password) newFieldErrors.password = true;
                    if (!email.trim()) newFieldErrors.email = true;
                    if (!passwordConfirm) newFieldErrors.passwordConfirm = true;

                    const emailTrimmed = email.trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (email.trim() && !emailRegex.test(emailTrimmed)) {
                        setErrorMsg("Please enter a valid email address");
                        newFieldErrors.email = true;
                    }

                    if (password && passwordConfirm && password !== passwordConfirm) {
                        setErrorMsg("Passwords do not match");
                        newFieldErrors.password = true;
                        newFieldErrors.passwordConfirm = true;
                    }

                    if (Object.keys(newFieldErrors).length > 0) {
                        setFieldErrors(newFieldErrors);
                        if (!errorMsg) setErrorMsg("Please enter in all fields");
>>>>>>> fbeec3b (save stuff)
                        return;
                    }

                    // Clear client-side error and proceed
<<<<<<< HEAD
=======
                    setFieldErrors({});
                    setErrorMsg(null);
>>>>>>> fbeec3b (save stuff)
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
        width: "70%",
        height: 40,
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 8,
        marginBottom: 16,
    },
    inputLabel: {
        width: "70%",
        marginBottom: 6,
        fontSize: 12,
        fontWeight: '600',
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
});
