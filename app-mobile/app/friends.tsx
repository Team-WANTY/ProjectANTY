import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Dimensions,
    Modal,
    TextInput,
    Pressable,
    ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect  } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import DecorativeSwoosh from "@/components/decorative-swoosh";

import { usersApi } from "@/services/api/users-api";
import { friendsApi, type Friendship } from "@/services/api/friends-api";
import { profileApi } from "@/services/api/profiles-api";
import { imagesApi } from "@/services/api/image-api";

const { width: screenWidth } = Dimensions.get("window");

type FriendUserInfo = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type DisplayFriend = Friendship & {
  user: FriendUserInfo;
};

// For /friends/me we assume owner_id === "me" and friend_id === "other user"
async function resolveUserInfoForFriendship(
  friendship: Friendship
): Promise<FriendUserInfo> {
  const userId = friendship.friend_id;

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

async function enrichFriendship(
  friendship: Friendship
): Promise<DisplayFriend> {
  const user = await resolveUserInfoForFriendship(friendship);
  return { ...friendship, user };
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
  const anim = useRef(new Animated.Value(1)).current;

  const handleUnfriend = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onUnfriend(friend.user.id); // still use friendship id here
    });
  };

  const animatedStyle = {
    opacity: anim,
    transform: [{ scale: anim }],
  };

  const avatarLetter =
    friend.user.username?.[0]?.toUpperCase() ?? "?";

  return (
    <Animated.View
      style={[
        styles.friendCard,
        { backgroundColor: theme.cardBackground },
        animatedStyle,
      ]}
    >
      <View style={styles.friendBanner}>
        {friend.user.avatarUrl ? (
          <Image
            source={{ uri: friend.user.avatarUrl }}
            style={styles.friendImage}
          />
        ) : (
          <View
            style={[
              styles.friendImage,
              { backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={styles.friendInitial}>{avatarLetter}</Text>
          </View>
        )}

        <View style={styles.friendInfo}>
          <TouchableOpacity
            onPress={() => onViewProfile(friend.user.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.friendName, { color: theme.text }]}>
              {friend.user.username}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.unfriendButton, { backgroundColor: theme.primary }]}
        onPress={handleUnfriend}
      >
        <Ionicons name="person-remove" size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};


export default function FriendsScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [friends, setFriends] = useState<DisplayFriend[]>([]);
    const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
    const [friendUsername, setFriendUsername] = useState("");
    
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [addFriendError, setAddFriendError] = useState<string | null>(null);

    const loadFriends = async () => {
        setLoading(true);
        setErrorText(null);
        try {
            const res = await friendsApi.listFriends(50);
            if (res.ok && res.data) {
                const enriched: DisplayFriend[] = await Promise.all(
                    res.data.friends.map((f) => enrichFriendship(f))
                );
                setFriends(enriched);
            } 
            else {
                setErrorText(res.message || "Failed to load friends");
            }
        } 
        catch (error) {
            setErrorText("Failed to load friends");
        } 
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFriends();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadFriends();
        }, [])
    );
    const handleUnfriend = async (friendId: string) => {
        const res = await friendsApi.unfriend(friendId);
        if (!res.ok) {
            console.log("Failed to unfriend:", res.message);
            console.log("FriendID:", friendId);
        return;
        }
        console.log("[handleUnfriend] Success")
        setFriends(prev => prev.filter(f => f.friend_id !== friendId));
    };

    const handleViewProfile = (userId: string) => {
        // Navigate to friend's profile - implement when backend is ready
        console.log("View profile:", userId);
        // router.push(`/profile/${friendId}`);
    };

    const handleIncomingFriendRequests = () => {
        router.push("/friends-requests");
        // Navigate to friend requests page - implement when backend is ready
        console.log("View friend requests");
    };

    const openAddFriendModal = () => {
        setAddFriendModalVisible(true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const closeAddFriendModal = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setAddFriendModalVisible(false);
            setFriendUsername("");
        });
    };

    const handleAddFriend = async ()  => {
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
                console.log("User not found:", res.message);
                setAddFriendError(res.message || "User not found");
                return;
            }

            const friend_id = res.data.id;

            console.log("[handleAddFriend] Sending friend request to:", friendUsername);

            // Send friend request
            const friendRes = await friendsApi.create({ to_user_id: friend_id });

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

            console.log("[handleAddFriend] Status:", friendRes.message);
            console.log("Friend Request ID:", friendRes.data.id);
            setAddFriendError(null);
            setFriendUsername("");
            closeAddFriendModal();
        }
        catch(err) {
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
                    <Text style={[styles.headerTitle, { color: headerTextColor, top: insets.top + 50, width: screenWidth, textAlign: "center" }]}>
                        Friends
                    </Text>

                    {/* Right Icons */}
                    <View style={[styles.rightIcons, { top: insets.top + 15 }]}>
                        {/* Friend Requests Icon */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={handleIncomingFriendRequests}
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
                    {friends.length} {friends.length === 1 ? "Friend" : "Friends"}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {friends.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color={theme.secondaryText} />
                        <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                            No friends yet
                        </Text>
                    </View>
                ) : (
                    friends.map((friend) => (
                        <FriendItem
                            key={friend.id}
                            friend={friend}
                            theme={theme}
                            onUnfriend={handleUnfriend}
                            onViewProfile={handleViewProfile}
                        />
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
                <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={closeAddFriendModal}
                    />
                    <Animated.View
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

                        <Text style={[styles.modalTitle, { color: theme.background }]}>
                            Add Friend
                        </Text>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: theme.background }]}>
                                Username
                            </Text>

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
                                <ActivityIndicator/>
                            ) : (
                                <Text style={styles.addButtonText}>Send Request</Text>
                            )}
                        </Pressable>

                    </Animated.View>
                </Animated.View>
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
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: "600",
    },
    friendInitial: {
        color: "#fff",
        fontSize: 20,
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
        fontSize: 12,
    },

});
