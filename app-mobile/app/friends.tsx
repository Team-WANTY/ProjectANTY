import React, { useState, useRef } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import DecorativeSwoosh from "@/components/decorative-swoosh";

const { width: screenWidth } = Dimensions.get("window");

// Mock friends data - this will be replaced with backend data
const mockFriends = [
    {
        id: 1,
        username: "Tin Nguyen",
        profilePicture: null,
        mutualFriends: 5,
    },
    {
        id: 2,
        username: "Yunis Nabiyev",
        profilePicture: null,
        mutualFriends: 3,
    },
    {
        id: 3,
        username: "Nick Fan",
        profilePicture: null,
        mutualFriends: 8,
    },
];

// Friend Item Component
const FriendItem = ({ friend, theme, onUnfriend, onViewProfile }: any) => {
    const anim = useRef(new Animated.Value(1)).current;

    const handleUnfriend = () => {
        Animated.timing(anim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            onUnfriend(friend.id);
        });
    };

    const animatedStyle = {
        opacity: anim,
        transform: [{ scale: anim }],
    };

    return (
        <Animated.View style={[styles.friendCard, { backgroundColor: theme.cardBackground }, animatedStyle]}>
            <View style={styles.friendBanner}>
                <View style={[styles.friendImage, { backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={28} color="#fff" />
                </View>
                <View style={styles.friendInfo}>
                    <TouchableOpacity onPress={() => onViewProfile(friend.id)} activeOpacity={0.7}>
                        <Text style={[styles.friendName, { color: theme.text }]}>{friend.username}</Text>
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
    const [friends, setFriends] = useState(mockFriends);
    const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
    const [friendUsername, setFriendUsername] = useState("");
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const handleUnfriend = (friendId: number) => {
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
    };

    const handleViewProfile = (friendId: number) => {
        // Navigate to friend's profile - implement when backend is ready
        console.log("View profile:", friendId);
        // router.push(`/profile/${friendId}`);
    };

    const handleFriendRequests = () => {
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

    const handleAddFriend = () => {
        // Implement add friend logic with backend
        console.log("Add friend:", friendUsername);
        closeAddFriendModal();
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
                            onPress={handleFriendRequests}
                        >
                            <Ionicons name="person-add-outline" size={24} color={headerTextColor} />
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
                                style={[styles.input, { color: theme.background, borderColor: theme.background }]}
                                value={friendUsername}
                                onChangeText={setFriendUsername}
                                placeholder="Enter username"
                                placeholderTextColor={theme.background + '80'}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: theme.primary }]}
                            onPress={handleAddFriend}
                        >
                            <Text style={styles.addButtonText}>Send Request</Text>
                        </TouchableOpacity>
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
});
