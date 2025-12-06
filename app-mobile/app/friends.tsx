import React, { useState, useRef, useEffect } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Animated as RNAnimated,
    Dimensions, Modal, TextInput, Pressable, ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import Animated, { LinearTransition, FadeIn, FadeOut } from "react-native-reanimated";

import { usersApi } from "@/services/api/users-api";
import { friendsApi, type Friendship } from "@/services/api/friends-api";
import { profileApi } from "@/services/api/profiles-api";
import { imagesApi } from "@/services/api/image-api";
import { useFriendsStore, type DisplayFriend, type FriendUserInfo } from "@/services/stores/friends-store";
import { useUserStore } from "@/services/stores/users-store";

const { width: screenWidth } = Dimensions.get("window");


// Helpers for resolving user info from a user id
async function resolveUserInfoForUserId(userId: string): Promise<FriendUserInfo> {
    let username = "Unknown user";
    let avatarUrl: string | null = null;

    // Get username
    const userRes = await usersApi.getById(userId);
    if (userRes.ok && userRes.data) {
        username = userRes.data.username;
    }

    // Get avatar_image_id from profile
    const profileRes = await profileApi.getById(userId);
    if (profileRes.ok && profileRes.data && profileRes.data.avatar_image_id) {
        const avatarImageId = profileRes.data.avatar_image_id;

        // Convert avatar_image_id -> URL
        const imgRes = await imagesApi.getUrl(avatarImageId);
        if (imgRes.ok && imgRes.data) {
            avatarUrl = imgRes.data;
        }
    }

    return { id: userId, username, avatarUrl };
}

// Build a DisplayFriend from a friendship_id
async function enrichFriend(friendshipId: string): Promise<DisplayFriend | null> {
    const friendshipRes = await friendsApi.getById(friendshipId);    
    if (!friendshipRes.ok || !friendshipRes.data) {
        console.log("[enrichFriendship] failed for", friendshipId, friendshipRes.message);
        return null;
    }

    const friendship: Friendship = friendshipRes.data;
    const meId = useUserStore.getState().userId;
    if (!meId) {
        console.warn("[enrichFriendship] missing current user id");
        return null;
    }

    // Figure out who the other user is
    const friendUserId =
    friendship.from_user_id === meId
      ? friendship.to_user_id
      : friendship.to_user_id === meId
      ? friendship.from_user_id
      : friendship.to_user_id; // fallback

    const user = await resolveUserInfoForUserId(friendUserId);

    return {
        ...friendship,
        friendUserId,
        user,
    };
}

function FriendItemWrapper({ children }: { children: React.ReactNode }) {
    return (
        <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            layout={LinearTransition.springify().duration(250)}
            style={{ width: "100%" }}
        >
            {children}
        </Animated.View>
    );
}

// Friend Item Component
type FriendItemProps = {
    friend: DisplayFriend;
    theme: any;
    onUnfriend: (userId: string) => void;
    onViewProfile: (userId: string) => void;
};

const FriendItem: React.FC<FriendItemProps> = ({
    friend,
    theme,
    onUnfriend,
    onViewProfile,
}) => {
    const displayName = friend.user.username || "Unknown user";
    const initial = displayName[0]?.toUpperCase() ?? "?";

    const handleUnfriendPress = () => { onUnfriend(friend.friendUserId) };

    return (
        <View
            style={[styles.friendCard, { backgroundColor: theme.cardBackground, shadowColor: theme.shadow }]}
        >
            <View style={styles.friendBanner}>
                {friend.user.avatarUrl ? (
                    <Image source={{ uri: friend.user.avatarUrl }} style={styles.friendImage} />
                ) : (
                    <View
                        style={[
                            styles.friendImage,
                            {
                                backgroundColor: theme.primary,
                                justifyContent: "center",
                                alignItems: "center",
                            },
                        ]}
                    >
                        <Text style={[styles.friendInitial, { color: theme.onPrimary }]}>{initial}</Text>
                    </View>
                )}

                <View style={styles.friendInfo}>
                    <TouchableOpacity
                        onPress={() => onViewProfile(friend.user.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.friendName, { color: theme.text }]}> {displayName} </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.unfriendButton, { backgroundColor: theme.primary }]}
                onPress={handleUnfriendPress}
            >
                <Ionicons name="person-remove" size={18} color={theme.text} />
            </TouchableOpacity>
        </View>
    );
};


export default function FriendsScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new RNAnimated.Value(0)).current;

    const friends = useFriendsStore((s) => s.friends);
    const friendCount = useFriendsStore((s) => s.friendCount);
    const setFriends = useFriendsStore((s) => s.setFriends);
    const removeFriend = useFriendsStore((s) => s.removeFriend);
    const addFriend = useFriendsStore((s) => s.addFriend);

    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
    const [friendUsername, setFriendUsername] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [addFriendError, setAddFriendError] = useState<string | null>(null);

    // Load friends in the background
    // friendsApi.listFriends returns friendship IDs
    // hydrate each via GET /friends/id/{friendship_id}
    const loadFriends = React.useCallback(async () => {
        setErrorText(null);
        setLoading(true);
        try {
            const res = await friendsApi.listFriends(20);
            if (res.ok && res.data) {
                const enrichedResults = await Promise.all(
                    res.data.ids.map((friendshipId) => enrichFriend(friendshipId))
                );
                const enriched: DisplayFriend[] = enrichedResults.filter(
                    (f): f is DisplayFriend => f !== null
                );
                setFriends(enriched);
                console.log("Loaded friends:", enriched.length);
            } else {
                setErrorText(res.message || "Failed to load friends");
            }
        } catch (error) {
            console.log("[loadFriends] error:", error);
            setErrorText("Failed to load friends");
        } finally {
            setLoading(false);
        }
    }, [setFriends]);

    useFocusEffect(
        React.useCallback(() => {
            loadFriends(); // background refresh whenever the screen is focused
        }, [loadFriends])
    );


    const handleUnfriend = (friendUserId: string) => {
        // Find the friend to re-add to the store incase the API fail
        const prevFriend = friends.find(
            (f) => f.friendUserId === friendUserId || f.user.id === friendUserId
        );

        // Optimistically remove friend from the store
        removeFriend(friendUserId);
        setErrorText(null);

        (async () => {
            try {
                // Call the API in the background
                const res = await friendsApi.unfriend(friendUserId);

                if (!res.ok) {
                    throw new Error(res.message || "Failed to unfriend.");
                }

                console.log("[handleUnfriend] Success");
            }
            catch (err) {
                console.log("[handleUnfriend] API error:", err);
                // Restore the friend in the UI if we removed them
                if (prevFriend) {
                    addFriend(prevFriend);
                }
                // Show an error message
                setErrorText("Failed to unfriend. Please try again.");
            }
        })();
    };

    const handleViewProfile = (userId: string) => {
        console.log("View profile:", userId);
        router.push({
            pathname: "/profile/[userId]",
            params: {userId},
        });
    };

    const handleViewFriendRequests = () => {
        router.push("/friends-requests");
        console.log("Loading friend requests");
    };

    const openAddFriendModal = () => {
        setAddFriendModalVisible(true); 
        RNAnimated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const closeAddFriendModal = () => {
        RNAnimated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setAddFriendModalVisible(false);
            setFriendUsername("");
        });
    };

    const handleAddFriend = async () => {
        if (isSending) return;
        const trimmed = friendUsername.trim();
        if (!trimmed) {
            setAddFriendError("Please enter a username.");
            return;
        }
        setIsSending(true);
        setAddFriendError(null);

        try {
            // GET other_user_id by looking up username
            const res = await usersApi.getByUsername(friendUsername.trim());
            if (!res.ok || !res.data) {
                console.log("[handleAddFriend] looking up username failed:", res.message);
                setAddFriendError(res.message || "User not found");
                return;
            }
            const friend_id = res.data;

            if (!friend_id || typeof friend_id !== "string") {
                console.error("[handleAddFriend] Invalid friend_id from getByUsername:",friend_id);
                setAddFriendError("Could not resolve that user's ID. Please try again.");
                return;
            }

            console.log("[handleAddFriend] Sending friend request:", trimmed);

            const friendRes = await friendsApi.create(friend_id);


            if (!friendRes.ok) {
                const status = friendRes.status;
                if (status === 403) {
                    if (friendRes.message.includes("Pending friend request already exist")) {
                        setAddFriendError("Pending friend request already exist");
                    }
                    else {
                        setAddFriendError("Cannot send friend request.");
                        console.log("Failed to send friend request: ", friendRes.message);
                    }
                }
                else if (status === 404) {
                    setAddFriendError("User not found.");
                }
                else {
                    setAddFriendError(friendRes.message || "Failed to send friend request.");
                }
                return;
            }
            console.log("[handleAddFriend]: Request Sent Successfully");
            setAddFriendError(null);
            setFriendUsername("");
            closeAddFriendModal();
        }
        catch (err) {
            console.log("Error sending friend request");
            setAddFriendError("Network error. Please try again.");
        }
        finally {
            setIsSending(false);
        }
    };

    const SWOOSH_COMPONENT_HEIGHT = screenWidth * 0.495;
    const headerTextColor = theme.background;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header with Swoosh */}
            <View style={{ height: SWOOSH_COMPONENT_HEIGHT }}>
                <DecorativeSwoosh
                    color={theme.border}
                    width={screenWidth}
                    height={SWOOSH_COMPONENT_HEIGHT}
                />

                {/* Header Controls */}
                <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top }]}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={[styles.backButton, { top: insets.top + 15 }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={headerTextColor} />
                    </TouchableOpacity>

                    {/* Friends Title */}
                    <Text style={[styles.headerTitle, { color: headerTextColor, top: insets.top + 50, width: screenWidth, textAlign: "center" }]}>Friend</Text>

                    {/* Right Icons */}
                    <View style={[styles.rightIcons, { top: insets.top + 15 }]}>
                        {/* Friend Requests Icon */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={handleViewFriendRequests}
                        >
                            <Ionicons name="people-outline" size={24} color={headerTextColor} />
                        </TouchableOpacity>

                        {/* Add Friend Icon */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={openAddFriendModal}
                        >
                            <Ionicons name="add-circle-outline" size={24} color={headerTextColor} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Friend Count */}
            <View style={styles.header}>
                <Text style={[styles.friendCount, { color: theme.text }]}>
                    {friendCount} {friendCount === 1 ? "Friend" : "Friends"}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {friends.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color={theme.secondaryText} />
                        <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No friends yet</Text>
                    </View>
                ) : (
                    friends.map((friend) => (
                        <FriendItemWrapper key={friend.id}>
                            <FriendItem
                                friend={friend}
                                theme={theme}
                                onUnfriend={handleUnfriend}
                                onViewProfile={handleViewProfile}
                            />
                        </FriendItemWrapper>
                    ))
                )}
            </ScrollView>

            {/* Add Friend Modal */}
            <Modal
                transparent
                visible={addFriendModalVisible}
                onRequestClose={closeAddFriendModal}
                animationType="none"
            >
                <RNAnimated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={closeAddFriendModal}
                    />
                    <RNAnimated.View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: theme.border,
                                transform: [{
                                    scale: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.95, 1]
                                    })
                                }]
                            }
                        ]}
                    >
                        <Pressable
                            style={styles.modalCloseButton}
                            onPress={closeAddFriendModal}
                        >
                            <Text style={styles.modalCloseText}>✕</Text>
                        </Pressable>

                        <Text style={[styles.modalTitle, { color: theme.background }]}>Add Friend</Text>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: theme.background }]}>Username</Text>

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: theme.background,
                                        borderColor: addFriendError ? "red" : theme.background,
                                    },
                                ]}
                                value={friendUsername}
                                onChangeText={(text) => {
                                    setFriendUsername(text);
                                    if (addFriendError) setAddFriendError(null); // clear error while typing
                                }}
                                placeholder="Enter username"
                                placeholderTextColor={theme.background + "80"}
                            />

                            {addFriendError && (
                                <Text style={styles.errorText}>{addFriendError}</Text>
                            )}
                        </View>

                        {/* Add Button */}
                        <Pressable
                            style={[
                                styles.addButton,
                                { backgroundColor: theme.primary },
                                (isSending || !friendUsername.trim()) && { opacity: 0.6 }

                            ]}
                            disabled={isSending || !friendUsername.trim()}
                            onPress={handleAddFriend}
                        >
                            {isSending ? (
                                <ActivityIndicator />
                            ) : (
                                <Text style={styles.addButtonText}>Send Request</Text>
                            )}
                        </Pressable>
                    </RNAnimated.View>
                </RNAnimated.View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        position: "absolute",
        left: 20,
        zIndex: 10,
    },
    headerTitle: {
        position: "absolute",
        fontSize: 28,
        fontWeight: "bold",
    },
    rightIcons: {
        position: "absolute",
        right: 20,
        flexDirection: "row",
        gap: 15,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        padding: 20,
        paddingTop: 10,
    },
    friendCount: {
        fontSize: 18,
        fontWeight: "600",
    },
    scrollContent: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    friendCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    friendBanner: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    friendImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
        marginRight: 12,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 18,
        fontWeight: "600",
    },
    friendInitial: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
    unfriendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "85%",
        borderRadius: 20,
        padding: 24,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalCloseButton: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 30,
        height: 30,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    modalCloseText: {
        fontSize: 24,
        fontWeight: "300",
        color: "#1e3a8a",
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
    },
    addButton: {
        padding: 16,
        borderRadius: 10,
        alignItems: "center",
    },
    addButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    errorText: {
        color: "red",
        marginTop: 4,
        fontSize: 14,
    },

});
