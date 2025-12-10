import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import ConfirmModal from "@/components/confirm-modal";

import { authApi } from "@/services/api/auth-api";
import { usersApi } from "@/services/api/users-api";
import { useUserStore } from "@/services/stores/users-store";

const { width } = Dimensions.get("window");

// -------------------------------------------------------------
// Helper Components
// -------------------------------------------------------------

const SettingItem = ({ theme, iconName, label, isExpanded, hasSubSettings, onPress }) => {
    const iconColor = theme.text;
    const arrowIcon = hasSubSettings
        ? isExpanded
            ? "chevron-down"
            : "chevron-forward"
        : "chevron-forward";

    return (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingItemLeft}>
                <Ionicons name={iconName} size={20} color={iconColor} style={styles.itemIcon} />
                <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
            </View>
            <Ionicons name={arrowIcon} size={20} color={iconColor} />
        </TouchableOpacity>
    );
};

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

const NavSubSetting = ({ theme, label, iconName, onPress, isSelected }) => (
    <TouchableOpacity style={styles.subSetting} onPress={onPress}>
        <View style={styles.settingItemLeft}>
            {iconName && (
                <Ionicons name={iconName} size={18} color={theme.text} style={styles.itemIcon} />
            )}
            <Text style={[styles.subSettingLabel, { color: theme.text }]}>{label}</Text>
        </View>
        {isSelected ? <Ionicons name="checkmark" size={18} color={theme.primary} /> : null}
    </TouchableOpacity>
);

// -------------------------------------------------------------
// Main Screen Component
// -------------------------------------------------------------

export default function SettingsScreen() {
    const { theme, setTheme, themeName } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = Dimensions.get("window");
    const userId = useUserStore(s => s.userId);

    const APP_VERSION = "Version 0.1.0";

    // Expandable menu state
    const [expandedSections, setExpandedSections] = useState({
        account: false,
        colorTheme: false,
        notifications: false,
        privacy: false,
        about: false,
    });

    // Toggle states
    const [toggles, setToggles] = useState({
        popups: true,
        muteFriends: false,
        taskNotifs: true,
        publicProfile: true,
        shareActivity: true,
    });

    // Delete account confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const toggleSwitch = (name) => {
        setToggles((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    // -------------------------------------------------------------
    // Delete Account Handler
    // -------------------------------------------------------------
    const handleDeleteAccount = async () => {
        if (!userId) {
            alert("Failed to delete account");
            return;
        }

        try {
            setIsDeleting(true);

            const result = await usersApi.remove(userId);

            if (!result.ok) {
                setIsDeleting(false);
                alert(result.message || "Failed to delete account");
                return;
            }

            await authApi.logout();
            setShowDeleteConfirm(false);
            router.replace("/login");
        }
        catch (error: any) {
            console.error(error.response?.data || error.message);
            alert(error?.message || "Unexpected error");
        }
        finally {
            setIsDeleting(false);
        }
    };

    // Header sizing
    const headerTextColor = theme.background;
    const bodyBackground = theme.background;
    const HEADER_CONTENT_HEIGHT = 50;
    const SWOOSH_HEIGHT = screenWidth * 0.495;

    return (
        <View style={[styles.container, { backgroundColor: bodyBackground }]}>
            {/* DELETE CONFIRMATION MODAL */}
            <ConfirmModal
                visible={showDeleteConfirm}
                title="Delete Account?"
                message="This action is permanent. Are you sure you want to delete your account?"
                confirmLabel="Delete"
                cancelLabel="Cancel"
                loading={isDeleting}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteAccount}
                theme={theme}
            />

            {/* Header */}
            <View style={{ height: SWOOSH_HEIGHT }}>
                <DecorativeSwoosh
                    color={theme.border}
                    width={screenWidth}
                    height={SWOOSH_HEIGHT}
                />

                <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top }]}>
                    <TouchableOpacity
                        style={[styles.backButton, { top: insets.top + 15 }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={headerTextColor} />
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.headerTitle,
                            { color: headerTextColor, top: insets.top + HEADER_CONTENT_HEIGHT },
                        ]}
                    >
                        Settings
                    </Text>
                </View>
            </View>

            {/* Scrollable Settings */}
            <ScrollView contentContainerStyle={styles.settingsContent} style={styles.scrollView}>
                {/* Account */}
                <SettingItem
                    theme={theme}
                    iconName="person-outline"
                    label="Account"
                    isExpanded={expandedSections.account}
                    hasSubSettings
                    onPress={() => toggleSection("account")}
                />
                {expandedSections.account && (
                    <View style={styles.subSettingsContainer}>
                        <NavSubSetting
                            theme={theme}
                            label="Change email"
                            onPress={() => router.push("./change-email")}
                        />
                        <NavSubSetting
                            theme={theme}
                            label="Change password"
                            onPress={() => router.push("./change-password")}
                        />
                        <NavSubSetting
                            theme={theme}
                            label="Delete Account"
                            onPress={() => setShowDeleteConfirm(true)}
                        />
                    </View>
                )}

                {/* Theme */}
                <SettingItem
                    theme={theme}
                    iconName="color-palette-outline"
                    label="Color Theme"
                    isExpanded={expandedSections.colorTheme}
                    hasSubSettings
                    onPress={() => toggleSection("colorTheme")}
                />
                {expandedSections.colorTheme && (
                    <View style={styles.subSettingsContainer}>
                        <NavSubSetting
                            theme={theme}
                            label="Blue"
                            iconName="color-palette-outline"
                            onPress={() => setTheme("blue")}
                            isSelected={themeName === "blue"}
                        />
                        <NavSubSetting
                            theme={theme}
                            label="Dark"
                            iconName="color-palette-outline"
                            onPress={() => setTheme("dark")}
                            isSelected={themeName === "dark"}
                        />
                        <NavSubSetting
                            theme={theme}
                            label="Light"
                            iconName="color-palette-outline"
                            onPress={() => setTheme("light")}
                            isSelected={themeName === "light"}
                        />
                    </View>
                )}

                {/* Notifications */}
                <SettingItem
                    theme={theme}
                    iconName="notifications-outline"
                    label="Notifications"
                    isExpanded={expandedSections.notifications}
                    hasSubSettings
                    onPress={() => toggleSection("notifications")}
                />
                {expandedSections.notifications && (
                    <View style={styles.subSettingsContainer}>
                        <ToggleSubSetting
                            theme={theme}
                            label="Allow pop-up notifications"
                            value={toggles.popups}
                            onToggle={() => toggleSwitch("popups")}
                        />
                        <ToggleSubSetting
                            theme={theme}
                            label="Mute friend activities"
                            value={toggles.muteFriends}
                            onToggle={() => toggleSwitch("muteFriends")}
                        />
                        <ToggleSubSetting
                            theme={theme}
                            label="Allow task notifications"
                            value={toggles.taskNotifs}
                            onToggle={() => toggleSwitch("taskNotifs")}
                        />
                    </View>
                )}

                {/* Privacy */}
                <SettingItem
                    theme={theme}
                    iconName="lock-closed-outline"
                    label="Privacy and Security"
                    isExpanded={expandedSections.privacy}
                    hasSubSettings
                    onPress={() => toggleSection("privacy")}
                />
                {expandedSections.privacy && (
                    <View style={styles.subSettingsContainer}>
                        <ToggleSubSetting
                            theme={theme}
                            label="Public Profile"
                            value={toggles.publicProfile}
                            onToggle={() => toggleSwitch("publicProfile")}
                        />
                        <ToggleSubSetting
                            theme={theme}
                            label="Share activity with friends"
                            value={toggles.shareActivity}
                            onToggle={() => toggleSwitch("shareActivity")}
                        />
                    </View>
                )}

                {/* About */}
                <SettingItem
                    theme={theme}
                    iconName="information-circle-outline"
                    label="About"
                    isExpanded={expandedSections.about}
                    hasSubSettings
                    onPress={() => toggleSection("about")}
                />
                {expandedSections.about && (
                    <View style={styles.subSettingsContainer}>
                        <Text style={[styles.aboutVersionText, { color: theme.text }]}>
                            {APP_VERSION}
                        </Text>
                    </View>
                )}

                {/* Log Out */}
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

// -------------------------------------------------------------
// Styles
// -------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },

    backButton: {
        position: "absolute",
        left: 15,
        zIndex: 2,
        padding: 5,
    },
    headerTitle: {
        position: "absolute",
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "700",
        zIndex: 2,
    },

    settingsContent: {
        paddingHorizontal: width * 0.05,
        paddingTop: 10,
        paddingBottom: 50,
        gap: 15,
    },

    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 5,
        minHeight: 30,
    },

    settingItemLeft: {
        flexDirection: "row",
        alignItems: "center",
    },

    itemIcon: { width: 30 },

    itemLabel: {
        fontSize: 16,
        fontWeight: "600",
    },

    subSettingsContainer: {
        paddingLeft: 40,
        gap: 10,
        marginBottom: 5,
    },

    subSetting: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
        paddingRight: 5,
    },

    subSettingLabel: {
        fontSize: 14,
        fontWeight: "400",
        flex: 1,
    },

    subSettingSwitch: { transform: [{ scale: 0.8 }] },

    aboutVersionText: {
        fontSize: 14,
        fontWeight: "400",
        paddingVertical: 5,
    },

    logoutButton: {
        alignSelf: "center",
        paddingVertical: 20,
        marginTop: 20,
    },

    logoutText: {
        fontSize: 16,
        fontWeight: "700",
    },
});
