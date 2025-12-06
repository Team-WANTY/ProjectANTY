import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Dimensions, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi } from "@/services/api/auth-api";
import DecorativeSwoosh from "@/components/decorative-swoosh";

const Register: React.FC = () => {
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
    const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; username?: boolean; password?: boolean; passwordConfirm?: boolean; }>({});
    const [loading, setLoading] = useState(false);
    const redirectTimer = useRef<any>(null);

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
            setTimeout(() =>  router.replace("/login"), 800);
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
        <View style={[styles.container, { backgroundColor: theme?.background ?? '#fff' }]}> 
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
                <DecorativeSwoosh color={theme?.primary ?? '#999999'} width={screenWidth} height={screenWidth * 0.495} />
                {/* Back Arrow */}
                <TouchableOpacity style={[styles.backButton, { top: insets.top + 15 }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={theme?.background ?? '#fff'}
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

            <Text style={[styles.title, { color: theme?.text ?? '#11181C' }]}>Create Account</Text>

            <Text style={[styles.inputLabel, { color: theme?.text ?? '#11181C' }]}>Email</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme?.inputBackground ?? '#F0F0F0', borderColor: fieldErrors.email ? 'red' : theme?.border ?? '#999999', color: theme?.text ?? '#11181C' },
                ]}
                placeholder="Email Address"
                placeholderTextColor={theme?.primary ?? '#999999'}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(text) => { setEmail(text); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: false })); }}
            />

            <Text style={[styles.inputLabel, { color: theme?.text ?? '#11181C' }]}>Username</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme?.inputBackground ?? '#F0F0F0', borderColor: fieldErrors.username ? 'red' : theme?.border ?? '#999999', color: theme?.text ?? '#11181C' },
                ]}
                placeholder="Username"
                placeholderTextColor={theme?.primary ?? '#999999'}
                value={username}
                onChangeText={(text) => { setUsername(text); if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: false })); }}
            />

            <Text style={[styles.inputLabel, { color: theme?.text ?? '#11181C' }]}>Password</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme?.inputBackground ?? '#F0F0F0', borderColor: fieldErrors.password ? 'red' : theme?.border ?? '#999999', color: theme?.text ?? '#11181C' },
                ]}
                placeholder="Password"
                placeholderTextColor={theme?.primary ?? '#999999'}
                secureTextEntry
                value={password}
                onChangeText={(text) => { setPassword(text); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: false })); }}
            />

            <Text style={[styles.inputLabel, { color: theme?.text ?? '#11181C' }]}>Confirm Password</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: theme?.inputBackground ?? '#F0F0F0', borderColor: fieldErrors.passwordConfirm ? 'red' : theme?.border ?? '#999999', color: theme?.text ?? '#11181C' },
                ]}
                placeholder="Confirm Password"
                placeholderTextColor={theme?.primary ?? '#999999'}
                secureTextEntry
                value={passwordConfirm}
                onChangeText={(text) => { setPasswordConfirm(text); if (fieldErrors.passwordConfirm) setFieldErrors(prev => ({ ...prev, passwordConfirm: false })); }}
            />

            {message ? (<Text style={[styles.message, isError ? styles.errorText : styles.successText]}>{message}</Text>) : null}
            
            <Pressable
                style={[styles.button, loading && { opacity: 0.6 }, { backgroundColor: theme?.primary ?? '#999999' }]}
                disabled={loading}
                onPress={() => {
                    // Quick pre-submit validation (mirrors handleRegister checks for instant feedback)
                    const newFieldErrors: any = {};
                    if (!username.trim()) newFieldErrors.username = true;
                    if (!password) newFieldErrors.password = true;
                    if (!email.trim()) newFieldErrors.email = true;
                    if (!passwordConfirm) newFieldErrors.passwordConfirm = true;

                    const emailTrimmed = email.trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (email.trim() && !emailRegex.test(emailTrimmed)) {
                        setMessage("Please enter a valid email address");
                        newFieldErrors.email = true;
                    }

                    if (password && passwordConfirm && password !== passwordConfirm) {
                        setMessage("Passwords do not match");
                        newFieldErrors.password = true;
                        newFieldErrors.passwordConfirm = true;
                    }

                    if (Object.keys(newFieldErrors).length > 0) {
                        setFieldErrors(newFieldErrors);
                        if (!message) { setMessage("Please enter in all fields"); setIsError(true); }
                        return;
                    }

                    // Clear client-side error and proceed
                    setFieldErrors({});
                    setMessage("");
                    setIsError(false);
                    handleRegister();
                }}
            >
                {loading ? <ActivityIndicator /> : <Text style={[styles.buttonText, { color: theme?.onPrimary ?? '#fff' }]}>Register</Text>}
            </Pressable>
        </View>
    );
};



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
        color: '#ff4d4f',
    },
    successText: {
        color: '#999999',
    },
});

export default Register;
