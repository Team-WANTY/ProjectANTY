import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {authApi} from '@/services/auth-api'
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";

import DecorativeSwoosh from "@/components/decorative-swoosh";

const { width } = Dimensions.get("window");

// --- Helper Components (omitted for brevity) ---
// ... SettingItem, ToggleSubSetting, NavSubSetting ...

// Renders the main setting items like "Account" or "Notifications"
const SettingItem = ({ theme, iconName, label, isExpanded, hasSubSettings, onPress }) => {
    const iconColor = theme.text;
    const arrowIcon = hasSubSettings
        ? (isExpanded ? "chevron-down" : "chevron-forward")
        : "chevron-forward"; // Use chevron-forward for non-expandable items (like About)

    return (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingItemLeft}>
                <Ionicons name={iconName} size={20} color={iconColor} style={styles.itemIcon} />
                <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
            </View>
            <Ionicons
                name={arrowIcon}
                size={20}
                color={iconColor}
            />
        </TouchableOpacity>
    );
};

// Renders sub-settings with a toggle switch (e.g., Notifications, Privacy)
const ToggleSubSetting = ({ theme, label, value, onToggle }) => (
    <View style={styles.subSetting}>
        <Text style={[styles.subSettingLabel, { color: theme.text }]}>{label}</Text>
        <Switch
            trackColor={{ false: theme.inputBackground, true: theme.border }}
            thumbColor={theme.primary}
            onValueChange={onToggle}
            value={value}
            style={styles.subSettingSwitch}
        />
    </View>
);

// Renders a simple navigation sub-item (e.g., Change email, Theme list)
const NavSubSetting = ({ theme, label, iconName, onPress }) => (
    <TouchableOpacity style={styles.subSetting} onPress={onPress}>
        <View style={styles.settingItemLeft}>
            {iconName && <Ionicons name={iconName} size={18} color={theme.text} style={styles.itemIcon} />}
            <Text style={[styles.subSettingLabel, { color: theme.text }]}>{label}</Text>
        </View>
    </TouchableOpacity>
);


// --- Main Screen Component ---
export default function SettingsScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = Dimensions.get("window");
    const APP_VERSION = "Version 0.1.0";

    // State management for expandable sections (omitted for brevity)
    const [expandedSections, setExpandedSections] = useState({
        account: false,
        colorTheme: false,
        notifications: false,
        privacy: false,
        about: false,
    });

    // State management for toggles (mocked)
    const [toggles, setToggles] = useState({
        popups: true,
        muteFriends: false,
        taskNotifs: true,
        publicProfile: true,
        shareActivity: true,
    });

    // Function to handle expansion/collapse of sections
    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Function to handle toggle switches
    const toggleSwitch = (name) => {
        setToggles(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const headerTextColor = theme.background;
    const bodyBackground = theme.background;

    // Define the height of the custom header area
    const HEADER_CONTENT_HEIGHT = 50; // Height of the Title/Back area
    const SWOOSH_COMPONENT_HEIGHT = screenWidth * 0.495; // Height of the SVG component

    return (
        <View style={[styles.container, { backgroundColor: bodyBackground }]}>

            {/* 1. Header Area: Swoosh and Controls */}
            {/* This View now dictates the space the header takes up in the vertical flow */}
            <View style={{ height: SWOOSH_COMPONENT_HEIGHT }}>
                <DecorativeSwoosh
                    color={theme.border} // Use theme.border for the light color
                    width={screenWidth}
                    height={SWOOSH_COMPONENT_HEIGHT}
                />

                {/* Controls (Absolute position relative to the parent View) */}
                <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top }]}>

                    {/* Back Arrow */}
                    <TouchableOpacity
                        style={[styles.backButton, { top: insets.top + 15 }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={headerTextColor} />
                    </TouchableOpacity>

                    {/* Settings Title */}
                    <Text style={[styles.headerTitle, { color: headerTextColor, top: insets.top + HEADER_CONTENT_HEIGHT }]}>
                        Settings
                    </Text>
                </View>
            </View>

            {/* 2. Settings Menu Items ScrollView */}
            <ScrollView
                // The scroll view starts right after the fixed-height View above
                contentContainerStyle={styles.settingsContent}
                style={styles.scrollView}
            >

                {/* 1. Account Section */}
                <SettingItem
                    theme={theme}
                    iconName="person-outline"
                    label="Account"
                    isExpanded={expandedSections.account}
                    hasSubSettings={true}
                    onPress={() => toggleSection('account')}
                />
                {expandedSections.account && (
                    <View style={styles.subSettingsContainer}>
                        <NavSubSetting theme={theme} label="Change email" onPress={() => { }} />
                        <NavSubSetting theme={theme} label="Change password" onPress={() => { }} />
                        <NavSubSetting theme={theme} label="Delete Account" onPress={() => { }} />
                    </View>
                )}

                {/* 2. Color Theme Section */}
                <SettingItem
                    theme={theme}
                    iconName="color-palette-outline"
                    label="Color Theme"
                    isExpanded={expandedSections.colorTheme}
                    hasSubSettings={true}
                    onPress={() => toggleSection('colorTheme')}
                />
                {expandedSections.colorTheme && (
                    <View style={styles.subSettingsContainer}>
                        <NavSubSetting theme={theme} label="Blue" iconName="color-palette-outline" onPress={() => { }} />
                        <NavSubSetting theme={theme} label="Dark" iconName="color-palette-outline" onPress={() => { }} />
                        <NavSubSetting theme={theme} label="Light" iconName="color-palette-outline" onPress={() => { }} />
                    </View>
                )}

                {/* 3. Notifications Section (Fully Implemented) */}
                <SettingItem
                    theme={theme}
                    iconName="notifications-outline"
                    label="Notifications"
                    isExpanded={expandedSections.notifications}
                    hasSubSettings={true}
                    onPress={() => toggleSection('notifications')}
                />
                {expandedSections.notifications && (
                    <View style={styles.subSettingsContainer}>
                        {/* Allow pop-up notifications */}
                        <ToggleSubSetting
                            theme={theme}
                            label="Allow pop-up notifications"
                            value={toggles.popups}
                            onToggle={() => toggleSwitch('popups')}
                        />
                        {/* Mute friend activities */}
                        <ToggleSubSetting
                            theme={theme}
                            label="Mute friend activities"
                            value={toggles.muteFriends}
                            onToggle={() => toggleSwitch('muteFriends')}
                        />
                        {/* Allow task notifications */}
                        <ToggleSubSetting
                            theme={theme}
                            label="Allow task notifications"
                            value={toggles.taskNotifs}
                            onToggle={() => toggleSwitch('taskNotifs')}
                        />
                    </View>
                )}

                {/* 4. Privacy and Security Section (Fully Implemented) */}
                <SettingItem
                    theme={theme}
                    iconName="lock-closed-outline"
                    label="Privacy and Security"
                    isExpanded={expandedSections.privacy}
                    hasSubSettings={true}
                    onPress={() => toggleSection('privacy')}
                />
                {expandedSections.privacy && (
                    <View style={styles.subSettingsContainer}>
                        {/* Public Profile */}
                        <ToggleSubSetting
                            theme={theme}
                            label="Public Profile"
                            value={toggles.publicProfile}
                            onToggle={() => toggleSwitch('publicProfile')}
                        />
                        {/* Share activity with friends */}
                        <ToggleSubSetting
                            theme={theme}
                            label="Share activity with friends"
                            value={toggles.shareActivity}
                            onToggle={() => toggleSwitch('shareActivity')}
                        />
                    </View>
                )}

                {/* 5. About Section */}
                <SettingItem
                    theme={theme}
                    iconName="information-circle-outline"
                    label="About"
                    isExpanded={false}
                    hasSubSettings={true}
                    onPress={() => toggleSection('about')}
                />
                {expandedSections.about && (
                    <View style={styles.subSettingsContainer}>
                        {/* Render the version number */}
                        <Text style={[styles.aboutVersionText, { color: theme.text }]}>
                            {APP_VERSION}
                        </Text>
                    </View>
                )}

                {/* 6. Log Out Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={async () => {
                        await authApi.logout();        
                        router.replace("/login");      
                    }}
                >
                    <Text style={[styles.logoutText, { color: theme.text }]}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

// -------------------------------------------------------------------
// --- STYLES ---
// -------------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // The main scroll view now takes the remaining space
    scrollView: {
        flex: 1,
    },

    // --- Header Control Styles (Absolute positioning relative to parent) ---
    backButton: {
        position: 'absolute',
        left: 15,
        zIndex: 2,
        padding: 5,
    },
    headerTitle: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '700',
        zIndex: 2,
    },

    // --- Settings Menu Styles ---
    settingsContent: {
        paddingHorizontal: width * 0.05,
        paddingTop: 10, // Small padding from the curve edge
        paddingBottom: 50, // Allow space for the bottom menu
        gap: 15,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 5,
        minHeight: 30,
        backgroundColor: 'transparent',
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIcon: {
        width: 30,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    // --- Sub-Settings Styles (omitted for brevity) ---
    subSettingsContainer: {
        paddingLeft: 40,
        gap: 10,
        marginBottom: 5,
    },
    subSetting: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
        paddingRight: 5,
    },
    subSettingLabel: {
        fontSize: 14,
        fontWeight: '400',
        flex: 1,
    },
    subSettingSwitch: {
        transform: [{ scale: 0.8 }],
    },
    aboutVersionText: {
        fontSize: 14,
        fontWeight: '400',
        paddingVertical: 5,
    },

    // --- Logout Button ---
    logoutButton: {
        alignSelf: 'center',
        paddingVertical: 20,
        marginTop: 20,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
