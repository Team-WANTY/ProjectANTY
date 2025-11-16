import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image,
    TextInput,
    Modal,
    Pressable,
    Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useTheme } from "@/context/ThemeContext";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import { HeaderBar } from "@/components/header-bar";

import { useUserStore } from "@/services/stores/users-store";
import { useProfileStore } from "@/services/stores/profiles-store";
import { usersApi } from "@/services/api/users-api";
import { profileApi } from "@/services/api/profiles-api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// --- Mock Data ---
// Note: friendsCount will be fetched from backend when integrated
const userData = {
    friendsCount: 3, // This will be dynamic from backend
    likes: 0,
    profilePicture: "../../assets/images/default-avatar.png",
};

const analyticsData = {
    tasksCompleted: 10,
    longestStreak: "3d",
    badgesEarned: "3/10",
};

// Mock badge images
const badgeImages = {
    badge1: "../../assets/images/icon.png", // Gold
    badge2: "../../assets/images/icon.png", // Silver
    badge3: "../../assets/images/icon.png", // Bronze
};

const badges = [
    { id: "b1", name: "BLAZING STREAK", image: badgeImages.badge1 },
    { id: "b2", name: "RISING FLAME", image: badgeImages.badge2 },
    { id: "b3", name: "TASK CHAMPION", image: badgeImages.badge3 },
    { id: "b4", name: "EARLY BIRD", image: badgeImages.badge1 },
    { id: "b5", name: "NIGHT OWL", image: badgeImages.badge2 },
];

// --- Main Profile Screen Component ---
export default function ProfileScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    // Pull user and profile from Zustand
    const username = useUserStore((s) => s.username);
    const email    = useUserStore(s => s.email);
    const userId   = useUserStore(s => s.userId);
    const bio = useProfileStore((s) => s.bio);

    // ---------- MODAL STATE ----------
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editUsername, setEditUsername] = useState(username);
    const [editBio, setEditBio] = useState(bio);
    const fadeAnim = useState(new Animated.Value(0))[0];
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    function openEditModal() {
        setEditUsername(username ?? "");
        setEditBio(bio ?? "");
        setIsEditModalVisible(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }

    function closeEditModal() {
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
            setIsEditModalVisible(false)
        );
    }

    async function handleSave() {
        if (!userId) {
            setErrorMsg("Missing user id.");
            return;
        }

        const trimmedUsername = (editUsername ?? "").trim();
        const trimmedBio = (editBio ?? "").trim();

        const usernameChanged = trimmedUsername !== (username ?? "");
        const bioChanged = trimmedBio !== (bio ?? "");

        if (!usernameChanged && !bioChanged) {
            closeEditModal();
            return;
        }

        setSaving(true);
        setErrorMsg(null);

        try {
            const ops: Promise<any>[] = [];
            if (bioChanged) // Call profiles service to update
                ops.push(profileApi.update(userId, {bio: trimmedBio}));
            if (usernameChanged) // Call user service to update
                ops.push(usersApi.update({ id: userId, username: trimmedUsername }));

            const results = await Promise.all(ops);
            for (const r of results) {
                if (r?.ok === false) throw new Error(r?.message || "Failed to save changes.");
            }
            
            if(usernameChanged) {
                useUserStore.getState().setUser({
                    id: userId,
                    username: trimmedUsername,
                    email: email ?? "",
                });
            }
            if(bioChanged) {
                useProfileStore.getState().setProfile({ bio: trimmedBio});
            }
            closeEditModal();

        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to save changes. Please try again.";
            setErrorMsg(msg);
        } finally {
            setSaving(false);
        }
    }

    // -------------------------------------------------------
    const HEADER_BACKGROUND_HEIGHT = screenWidth * 0.495;

    const backgroundPrimary = theme.background;
    const headerLightColor = theme.border;
    const textDarkOnLight = theme.background;
    const textLightOnDark = theme.text;

    return (
        <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
            {/* 1. TOP HEADER SECTION */}
            <View style={[styles.headerSection, { height: HEADER_BACKGROUND_HEIGHT }]}>
                <HeaderBar
                    title="Home"
                    showTitle={false}
                    onNotificationPress={() => {}}
                    onSettingsPress={() => router.push("../settings")}
                />

                <View style={styles.profileRow}>
                    <View style={styles.swooshContainer}>
                        <DecorativeSwoosh
                            color={headerLightColor}
                            width={screenWidth}
                            height={HEADER_BACKGROUND_HEIGHT * 1.1}
                        />
                    </View>

                    <Image source={{ uri: userData.profilePicture }} style={styles.profileImage} />

                    <View style={styles.userInfo}>
                        <Text style={styles.displayUsername}>{username}</Text>
                        <View style={styles.socialStats}>
                            <TouchableOpacity onPress={() => router.push("../friends" as any)}>
                                <Text style={styles.socialText}>
                                    {userData.friendsCount} <Text style={styles.friendsLink}>Friends</Text>
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.socialText}>{userData.likes} Likes</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.editProfileButton} onPress={openEditModal}>
                        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* ---------- EDIT PROFILE MODAL ---------- */}
                <Modal
                    transparent
                    animationType="none"
                    visible={isEditModalVisible}
                    onRequestClose={closeEditModal}
                >
                    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={closeEditModal} />
                        <Animated.View
                            style={[
                                styles.modalContent,
                                {
                                    backgroundColor: theme.border,
                                    transform: [
                                        {
                                            scale: fadeAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.95, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <Pressable
                                accessible
                                accessibilityLabel="Close edit profile"
                                onPress={closeEditModal}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>

                            <Text style={[styles.modalTitle, { color: theme.background }]}>
                                Edit Profile
                            </Text>

                            {/* Username */}
                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>
                                    Username
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        { color: theme.background, borderColor: theme.background },
                                    ]}
                                    value={editUsername}
                                    onChangeText={setEditUsername}
                                    placeholder="Enter username"
                                    placeholderTextColor={theme.background + "80"}
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Bio */}
                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>
                                    Bio
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.background,
                                            borderColor: theme.background,
                                            minHeight: 80,
                                            textAlignVertical: "top",
                                        },
                                    ]}
                                    value={editBio}
                                    onChangeText={setEditBio}
                                    placeholder="Tell us about yourself..."
                                    placeholderTextColor={theme.background + "80"}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            {errorMsg && (
                                <Text
                                    style={{
                                        marginTop: 6,
                                        marginBottom: 6,
                                        color: "#b00020",
                                        textAlign: "center",
                                    }}
                                >
                                    {errorMsg}
                                </Text>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.saveButton,
                                    {
                                        backgroundColor: theme.primary || theme.text,
                                        opacity: saving ? 0.6 : 1,
                                    },
                                ]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                <Text style={[styles.saveButtonText, { color: "#fff" }]}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </Modal>
            </View>

            {/* 2. SCROLLABLE CONTENT AREA */}
            <ScrollView contentContainerStyle={styles.scrollContentContainer}>
                {/* Bio Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>Bio</Text>
                    <View
                        style={[
                            styles.bioInputFrame,
                            { backgroundColor: headerLightColor, borderColor: headerLightColor },
                        ]}
                    >
                        <Text style={[styles.bioTextInput, { color: textDarkOnLight }]}>{bio}</Text>
                    </View>
                </View>

                {/* Analytics Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>
                        Analytics
                    </Text>
                    <View
                        style={[
                            styles.analyticsCard,
                            { backgroundColor: headerLightColor, borderColor: headerLightColor },
                        ]}
                    >
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textLightOnDark }]}>
                                {analyticsData.tasksCompleted}
                            </Text>
                            <Text style={[styles.analyticLabel, { color: textLightOnDark }]}>
                                Tasks completed
                            </Text>
                        </View>
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textLightOnDark }]}>
                                {analyticsData.longestStreak}
                            </Text>
                            <Text style={[styles.analyticLabel, { color: textLightOnDark }]}>
                                Longest task streak
                            </Text>
                        </View>
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textLightOnDark }]}>
                                {analyticsData.badgesEarned}
                            </Text>
                            <Text style={[styles.analyticLabel, { color: textLightOnDark }]}>
                                Badges earned
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Badges Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>Badges</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.badgesContainer}
                    >
                        {badges.map((badge) => (
                            <View key={badge.id} style={styles.badgeItem}>
                                <Image source={{ uri: badge.image }} style={styles.badgeImage} />
                                <Text style={[styles.badgeText, { color: textDarkOnLight }]}>
                                    {badge.name}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
}

// -------------------------------------------------------------------
// --- STYLES ---
// -------------------------------------------------------------------

const SWOOSH_FACTOR = 0.55;
const PADDING_HORIZONTAL = screenWidth * 0.05;
const HEADER_BACKGROUND_HEIGHT = screenWidth * SWOOSH_FACTOR;
const IMAGE_SIZE = screenWidth * 0.18;

function getStyles(theme: any) {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
        },
        modalContent: {
            width: "85%",
            borderRadius: 15,
            padding: 20,
            elevation: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 20,
            textAlign: "center",
        },
        modalCloseButton: {
            position: "absolute",
            top: 10,
            right: 10,
            padding: 6,
            borderRadius: 12,
            zIndex: 10,
        },
        modalCloseText: {
            fontSize: 18,
            fontWeight: "700",
            color: "#1D3B53",
        },
        inputContainer: {
            marginBottom: 15,
        },
        inputLabel: {
            fontSize: 16,
            marginBottom: 5,
            fontWeight: "500",
        },
        input: {
            borderWidth: 1,
            borderRadius: 8,
            padding: 10,
            fontSize: 16,
        },
        saveButton: {
            padding: 15,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 10,
        },
        saveButtonText: {
            fontSize: 16,
            fontWeight: "bold",
        },
        container: { flex: 1 },
        headerSection: {
            width: "100%",
            height: HEADER_BACKGROUND_HEIGHT * 1.1,
            marginBottom: HEADER_BACKGROUND_HEIGHT * 0.3,
        },
        swooshContainer: {
            position: "absolute",
            top: -(HEADER_BACKGROUND_HEIGHT * 0.15),
            left: 0,
            width: screenWidth,
        },
        profileRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: PADDING_HORIZONTAL,
            paddingTop: screenHeight * 0.01,
        },
        profileImage: {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: IMAGE_SIZE / 2,
            borderWidth: 2,
            borderColor: "#fff",
            marginRight: PADDING_HORIZONTAL * 0.5,
        },
        userInfo: { flex: 1 },
        displayUsername: {
            fontSize: screenWidth * 0.045,
            fontWeight: "bold",
            marginBottom: screenHeight * 0.005,
            color: theme.background,
        },
        socialStats: {
            flexDirection: "row",
            gap: screenWidth * 0.02,
            color: theme.secondaryText,
        },
        socialText: {
            fontSize: screenWidth * 0.03,
            color: theme.secondaryText,
        },
        editProfileButton: {
            paddingVertical: screenHeight * 0.007,
            paddingHorizontal: screenWidth * 0.04,
            borderRadius: screenWidth * 0.02,
            backgroundColor: theme.text,
        },
        editProfileButtonText: {
            fontSize: screenWidth * 0.03,
            fontWeight: "600",
            color: theme.secondaryText,
        },
        scrollContentContainer: {
            paddingHorizontal: 20,
            paddingBottom: 100,
        },
        section: { marginBottom: 25 },
        sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
        bioInputFrame: {
            padding: 10,
            borderRadius: 5,
            minHeight: 80,
            borderWidth: 1,
        },
        bioTextInput: {
            fontSize: 14,
            minHeight: 60,
            textAlignVertical: "top",
        },
        analyticsCard: {
            borderRadius: 5,
            padding: 15,
            gap: 10,
            borderWidth: 1,
        },
        analyticItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 15,
        },
        analyticValue: { fontSize: 18, fontWeight: "bold", minWidth: 40 },
        analyticLabel: { fontSize: 14, fontWeight: "500" },
        badgesContainer: { paddingVertical: 5, gap: 10 },
        badgeItem: { alignItems: "center", width: 70 },
        badgeImage: {
            width: 50,
            height: 60,
            borderRadius: 5,
            marginBottom: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.25,
            shadowRadius: 1.84,
            elevation: 2,
        },
        badgeText: {
            fontSize: 8,
            fontWeight: "bold",
            textAlign: "center",
            lineHeight: 10,
        },
        friendsLink: {
            textDecorationLine: "underline",
        },
    });
}
