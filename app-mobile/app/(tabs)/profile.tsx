import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image,
    TextInput
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";

import { useTheme } from "@/context/ThemeContext";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import { HeaderBar } from "@/components/header-bar";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// --- Mock Data ---
const userData = {
    username: "anitadmrc",
    friends: 3,
    likes: 0,
    bio: "This is a placeholder for my awesome bio!",
    profilePicture: '../../assets/images/default-avatar.png',
};

const analyticsData = {
    tasksCompleted: 10,
    longestStreak: "3d",
    badgesEarned: "3/10",
};

// Mock badge images (replace with your actual local imports if needed)
const badgeImages = {
    badge1: '../../assets/images/icon.png', // Gold
    badge2: '../../assets/images/icon.png', // Silver
    badge3: '../../assets/images/icon.png', // Bronze
};

const badges = [
    { id: 'b1', name: 'BLAZING STREAK', image: badgeImages.badge1 },
    { id: 'b2', name: 'RISING FLAME', image: badgeImages.badge2 },
    { id: 'b3', name: 'TASK CHAMPION', image: badgeImages.badge3 },
    { id: 'b4', name: 'EARLY BIRD', image: badgeImages.badge1 }, // Example
    { id: 'b5', name: 'NIGHT OWL', image: badgeImages.badge2 }, // Example
];

// --- Main Profile Screen Component ---
export default function ProfileScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    const [bioText, setBioText] = useState(userData.bio);

    // Dynamic header height including safe area
    const HEADER_BACKGROUND_HEIGHT = screenWidth * 0.495; // Height for the swoosh SVG

    // Colors from your theme
    const backgroundPrimary = theme.background;
    const headerLightColor = theme.border;
    const textDarkOnLight = theme.background;
    const textLightOnDark = theme.text;
    const buttonTextColor = theme.background;

    return (
        <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>

            {/* 1. TOP HEADER SECTION (Swoosh, Profile Info, Icons) */}
            <View style={[styles.headerSection, { height: HEADER_BACKGROUND_HEIGHT }]}>
                {/* Decorative Swoosh Background */}
                {/* Header Bar */}
                <HeaderBar
                    title="Home"
                    showTitle={false}
                    onNotificationPress={() => { /* navigation.navigate('Notifications') */ }}
                    onSettingsPress={() => { router.push("../settings") }}
                />

                <View style={styles.profileRow}>
                    <View style={styles.swooshContainer}>
                        <DecorativeSwoosh color={headerLightColor} width={screenWidth} height={HEADER_BACKGROUND_HEIGHT * 1.1} />
                    </View>

                    <Image source={{ uri: userData.profilePicture }} style={styles.profileImage} />

                    <View style={styles.userInfo}>
                        <Text style={styles.username}>{userData.username}</Text>
                        <View style={styles.socialStats}>
                            <Text style={styles.socialText}>{userData.friends} Friends</Text>
                            <Text style={styles.socialText}>{userData.likes} Likes</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.editProfileButton}>
                        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

            </View>


            {/* 2. SCROLLABLE CONTENT AREA (Bio, Analytics, Badges) */}
            <ScrollView contentContainerStyle={styles.scrollContentContainer}>

                {/* Bio Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>Bio</Text>
                    <View style={[styles.bioInputFrame, { backgroundColor: headerLightColor, borderColor: headerLightColor }]}>
                        <TextInput
                            style={[styles.bioTextInput, { color: textDarkOnLight }]}
                            multiline
                            placeholder="Tell us about yourself..."
                            placeholderTextColor={textDarkOnLight + '80'} // Lighter version of dark text
                            value={bioText}
                            onChangeText={setBioText}
                        />
                    </View>
                </View>

                {/* Analytics Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>Analytics</Text>
                    <View style={[styles.analyticsCard, { backgroundColor: headerLightColor, borderColor: headerLightColor }]}>
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textDarkOnLight }]}>{analyticsData.tasksCompleted}</Text>
                            <Text style={[styles.analyticLabel, { color: textDarkOnLight }]}>Tasks completed</Text>
                        </View>
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textDarkOnLight }]}>{analyticsData.longestStreak}</Text>
                            <Text style={[styles.analyticLabel, { color: textDarkOnLight }]}>Longest task streak</Text>
                        </View>
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textDarkOnLight }]}>{analyticsData.badgesEarned}</Text>
                            <Text style={[styles.analyticLabel, { color: textDarkOnLight }]}>Badges earned</Text>
                        </View>
                    </View>
                </View>

                {/* Badges Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>Badges</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesContainer}>
                        {badges.map((badge) => (
                            <View key={badge.id} style={styles.badgeItem}>
                                <Image source={{ uri: badge.image }} style={styles.badgeImage} />
                                <Text style={[styles.badgeText, { color: textDarkOnLight }]}>{badge.name}</Text>
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
const PADDING_HORIZONTAL = screenWidth * 0.05
const HEADER_BACKGROUND_HEIGHT = screenWidth * SWOOSH_FACTOR;
const IMAGE_SIZE = screenWidth * 0.18;       // ~18% of screen width

function getStyles(theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
        },
        // --- Header Section ---
        headerSection: {
            width: '100%',
            // This ensures the layout reserves enough space for the content.
            height: HEADER_BACKGROUND_HEIGHT * 1.1,
            marginBottom: HEADER_BACKGROUND_HEIGHT * .3,
        },
        swooshContainer: {
            position: 'absolute',
            top: -(HEADER_BACKGROUND_HEIGHT * .15),
            left: 0,
            width: screenWidth,
            // The height of the DecorativeSwoosh is passed via props and handled internally
        },
        topIconsContainer: {
            position: 'absolute',
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 15,
            zIndex: 10,
        },
        iconButton: {
            padding: 5,
        },
        profileRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: PADDING_HORIZONTAL,
            paddingTop: screenHeight * 0.01,  // small top spacing relative to height
        },

        profileImage: {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: IMAGE_SIZE / 2,
            borderWidth: 2,
            borderColor: '#fff',
            marginRight: PADDING_HORIZONTAL * 0.5,
        },

        userInfo: {
            flex: 1,
        },

        username: {
            fontSize: screenWidth * 0.045,   // responsive text (about 4.5% of width)
            fontWeight: 'bold',
            marginBottom: screenHeight * 0.005,
            color: theme.background
        },

        socialStats: {
            flexDirection: 'row',
            gap: screenWidth * 0.02,
            color: theme.secondaryText
        },

        socialText: {
            fontSize: screenWidth * 0.03,   // ~3% of screen width
            color: theme.secondaryText
        },

        editProfileButton: {
            paddingVertical: screenHeight * 0.007,
            paddingHorizontal: screenWidth * 0.04,
            borderRadius: screenWidth * 0.02,
            backgroundColor: theme.text,
        },

        editProfileButtonText: {
            fontSize: screenWidth * 0.03,
            fontWeight: '600',
            color: theme.secondaryText
        },

        // --- Scrollable Content ---
        scrollContentContainer: {
            paddingHorizontal: 20,
            paddingBottom: 100, // Ensure space for bottom nav bar if present
        },
        section: {
            marginBottom: 25,
        },
        sectionTitle: {
            fontSize: 18, // Figma was 15px, scaled for readability
            fontWeight: 'bold',
            marginBottom: 10,
        },
        // Bio Input Frame
        bioInputFrame: {
            padding: 10,
            borderRadius: 5,
            minHeight: 80, // Adjust height as needed
            borderWidth: 1,
        },
        bioTextInput: {
            fontSize: 14,
            minHeight: 60,
            textAlignVertical: 'top', // Make text start from top in multiline
        },

        // Analytics Card
        analyticsCard: {
            borderRadius: 5,
            padding: 15,
            gap: 10,
            borderWidth: 1,
        },
        analyticItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 15, // Space between number and label
        },
        analyticValue: {
            fontSize: 18, // Figma was 14px, scaled for readability
            fontWeight: 'bold',
            minWidth: 40, // Ensure numbers align
        },
        analyticLabel: {
            fontSize: 14, // Figma was 10px, scaled for readability
            fontWeight: '500',
        },

        // Badges Section
        badgesContainer: {
            paddingVertical: 5,
            gap: 10, // Space between badges
        },
        badgeItem: {
            alignItems: 'center',
            width: 70, // Fixed width for each badge card
        },
        badgeImage: {
            width: 50, // Figma was 52px, adjust as needed
            height: 60, // Figma was 64px, adjust as needed
            borderRadius: 5, // Match rounded corners
            marginBottom: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.25,
            shadowRadius: 1.84,
            elevation: 2,
        },
        badgeText: {
            fontSize: 8, // Figma was 5px, adjust for readability
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: 10,
        },
    });
}