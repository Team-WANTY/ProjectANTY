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
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import { HeaderBar } from "@/components/header-bar";
import * as ImagePicker from "expo-image-picker";

import { useUserStore } from "@/services/stores/users-store";
import { useProfileStore } from "@/services/stores/profiles-store";
import { useCreatorsStore } from "@/services/stores/creators-store";
import { usersApi } from "@/services/api/users-api";
import { profileApi } from "@/services/api/profiles-api";
import { imagesApi } from "@/services/api/image-api";
import { EditProfileModal } from "@/components/profile-edit-modal"
import { changeAvatar } from "@/services/actions/avatar-update";
import { EditPhotoModal } from "@/components/profile-edit-photo-modal";
import { useFriendsStore } from "@/services/stores/friends-store"
import { useNotificationModal } from "@/app/_layout";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
    const { theme, themeName } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);
    const { showNotifications } = useNotificationModal();
    const insets = useSafeAreaInsets();

    // Pull user and profile from Zustand
    const username = useUserStore((s) => s.username);
    const userId = useUserStore(s => s.userId);
    const bio = useProfileStore((s) => s.bio);
    const avatarUrl = useProfileStore((s) => s.avatarUrl);
    const isAvatarUploading = useProfileStore((s) => s.isAvatarUploading);
    const friendsCount = useFriendsStore((s) => s.friendCount)

    // ---------- MODAL STATE ----------
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);
    const [editUsername, setEditUsername] = useState<string>(username ?? "");
    const [editBio, setEditBio] = useState<string>(bio ?? "");
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

    const handleProfileSave = (newUsername: string, newBio: string) => {
        setSaving(true);
        setErrorMsg(null);
        // Determine what changed
        const usernameChanged = newUsername !== (username ?? "");
        const bioChanged = newBio !== (bio ?? "");

        // Optimistically update Zustand store FIRST 
        if (usernameChanged) {
            useUserStore.getState().setUser({ username: newUsername });
            if(userId) {
                useCreatorsStore.getState().setCreator({id: userId, username: newUsername, avatarUrl: avatarUrl});
            }
        }
            
        if (bioChanged) {
            useProfileStore.getState().setProfile({ bio: newBio });
        }

        // Close modal 
        closeEditModal();

        (async () => {
            try {
                // API calls sequentially
                if (usernameChanged) {
                    const res = await usersApi.update({ id: userId!, username: newUsername });
                    if (!res.ok) console.log("Failed to update username on backend");
                }

                if (bioChanged) {
                    const res = await profileApi.update(userId!, { bio: newBio });
                    if (!res.ok) console.log("Failed to update bio on backend");
                }
            }
            catch (err) {
                console.log("Network error while updating profile");
            }
            finally {
                setSaving(false);
            }
        })();

        /*
        * TODO
        * rollback incase api call fails
        * display error on UI whhen api call fails
        * retry logic
        * background queue systems when backend is working again
        */
    };

    const handleRemoveAvatar = () => {
        if (!userId) return;

        const {
            avatarImageId: currentAvatarId,
            setProfile,
            setAvatarUploading,
        } = useProfileStore.getState();

        // If there is no avatar, return
        if (!currentAvatarId) {
            console.log("No avatar to delete");
            return;
        }

        console.log("Deleting avatar in Zustand store");
        // Clear avatar in UI optimistically 
        setProfile({
            userId,
            avatarUrl: null,
            avatarImageId: null,
        });

        setIsPhotoSheetVisible(false);

        // If there's nothing to delete on backend, we're done
        if (!currentAvatarId) {
            return;
        }

        // Background work: DELETE /images + PATCH /profiles
        (async () => {
            try {
                setAvatarUploading(true);

                console.log("Calling DELETE /images");
                // DELETE /images/
                const deleteRes = await imagesApi.remove(currentAvatarId);
                if (!deleteRes.ok) {
                    console.warn(
                        "[ProfileScreen.handleRemoveAvatar] FAILED deleting image",
                        deleteRes.status,
                        deleteRes.message
                    );
                    // TODO
                    // requeue & retry logic
                }

                console.log("Calling PATCH /profiles");
                // PATCH /profiles/
                const patchRes = await profileApi.update(userId, {
                    avatar_image_id: null,
                });
                if (!patchRes.ok) {
                    console.warn(
                        "[ProfileScreen.handleRemoveAvatar] FAILED patching profile (avatar_image_id = null)",
                        patchRes.status,
                        patchRes.message
                    );
                    // TODO
                    // requeue & retry logic
                }
                console.log("[handleRemoveAvatar] Avatar deleted in store and backend");
            } catch (err) {
                console.warn(
                    "[ProfileScreen.handleRemoveAvatar] Unexpected background error",
                    err
                );
            } finally {
                setAvatarUploading(false);
            }
        })();
    };

    // -------------------------------------------------------
    const HEADER_BACKGROUND_HEIGHT = screenWidth * 0.495;

    const backgroundPrimary = theme.background;
    const headerLightColor = theme.border;
    const textDarkOnLight = theme.background;
    const textLightOnDark = theme.text;

    const isDark = theme.background === '#151718';
    return (
        <View style={[styles.container, { backgroundColor: backgroundPrimary }]}> 
            {/* 1. TOP HEADER SECTION */}
            <View style={[styles.headerSection, { height: HEADER_BACKGROUND_HEIGHT }]}>
                <HeaderBar
                    title="Profile"
                    showTitle={true}
                    onNotificationPress={showNotifications}
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

                    <View style={styles.avatarWrapper}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
                        ) : (
                            <View
                                style={[
                                    styles.avatarFallback,
                                    { backgroundColor: theme.primary },
                                ]}
                            >
                                <Text style={styles.avatarInitial}>
                                    {username?.[0]?.toUpperCase() ?? "?"}
                                </Text>
                            </View>
                        )}

                        {isAvatarUploading && (
                            <View style={styles.avatarSpinnerOverlay}>
                                <ActivityIndicator />
                            </View>
                        )}
                    </View>


                        <View style={styles.userInfo}> 
                            <Text style={styles.displayUsername}>{username}</Text> 
                            <View style={styles.socialStats}> 
                                <TouchableOpacity onPress={() => router.push("../friends" as any)}> 
                                    <Text style={[styles.socialText, { color: theme.modalBorder }]}> 
                                        {friendsCount} <Text style={styles.friendsLink}>Friends</Text> 
                                    </Text> 
                                </TouchableOpacity> 
                            </View> 
                        </View> 

                    <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: themeName === 'lilac' ? '#fff' : (themeName === 'dark' ? '#000' : theme.text) }]} onPress={openEditModal}>
                        <Text style={[styles.editProfileButtonText, { color: theme.primary }]}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>


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
                            <Text style={[styles.analyticValue, { color: textDarkOnLight }]}>
                                
                            </Text>
                            <Text style={[styles.analyticLabel, { color: textDarkOnLight }]}>
                                
                            </Text>
                        </View>
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textDarkOnLight }]}>
                                
                            </Text>
                            <Text style={[styles.analyticLabel, { color: textDarkOnLight }]}>
                                
                            </Text>
                        </View>
                        <View style={styles.analyticItem}>
                            <Text style={[styles.analyticValue, { color: textDarkOnLight }]}>
                                
                            </Text>
                            <Text style={[styles.analyticLabel, { color: textDarkOnLight }]}>
                                
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Badges Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>Badges</Text>
                </View>
            </ScrollView>

            {/* ---------- EDIT PROFILE MODAL ---------- */}
            <EditProfileModal
                visible={isEditModalVisible}
                username={username}
                bio={bio}
                avatarUrl={avatarUrl}
                saving={saving}
                errorMsg={errorMsg}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleProfileSave}
                onChangePhoto={() => setIsPhotoSheetVisible(true)}
            />

            <EditPhotoModal
                visible={isPhotoSheetVisible}
                onClose={() => setIsPhotoSheetVisible(false)}
                onChooseFromLibrary={() => {
                    if (!userId) return;
                    changeAvatar(
                        userId,
                        () => setIsPhotoSheetVisible(false),
                        "library"
                    );
                }}
                onTakePhoto={() => {
                    if (!userId) return;
                    changeAvatar(
                        userId,
                        () => setIsPhotoSheetVisible(false),
                        "camera"
                    );
                }}
                onRemoveAvatar={handleRemoveAvatar}
            />
        </View>
    );
}

// -------------------------------------------------------------------
// --- STYLES ---
// -------------------------------------------------------------------

const SWOOSH_FACTOR = 0.55;
const PADDING_HORIZONTAL = screenWidth * 0.05;
const HEADER_BACKGROUND_HEIGHT = screenWidth * SWOOSH_FACTOR;
const IMAGE_SIZE = screenWidth * 0.25;

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
            color: theme.primary,
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
            width: "100%",
            height: "100%",
            borderRadius: IMAGE_SIZE / 2,
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
            backgroundColor: theme.name === 'dark' ? '#000' : theme.text,
        },
        editProfileButtonText: {
            fontSize: screenWidth * 0.03,
            fontWeight: "600",
            color: theme.name === 'dark' ? '#000000ff' : theme.secondaryText,
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
        avatarWrapper: {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: IMAGE_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            marginRight: PADDING_HORIZONTAL * 0.5,
            position: "relative",
        },
        avatarSpinnerOverlay: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.25)",
            borderRadius: IMAGE_SIZE / 2,
        },
        avatarFallback: {
            width: "100%",
            height: "100%",
            borderRadius: IMAGE_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
        },
        avatarInitial: {
            fontSize: 46,
            fontWeight: "700",
            color: "white",
        },
    });
}
