import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    TouchableOpacity,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar";
import FriendActivityItem from "@/components/friend-activity";
import { useNotificationModal } from "@/app/_layout";
import { useRouter } from "expo-router";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Relative sizing helpers
const wp = (pct: number) => screenWidth * (pct / 100);
const hp = (pct: number) => screenHeight * (pct / 100);

interface Comment {
    id: string;
    username: string;
    text: string;
    time: string;
    avatar: any;
}

interface FeedItem {
    id: string;
    name: string;
    message: string;
    time: string;
    avatar: any;
    commentsEnabled: boolean;
    comments: Comment[];
}

const initialData: FeedItem[] = [
    {
        id: "1",
        name: "tinnguyen",
        message: "Just took a nap",
        time: "2 hrs. ago",
        avatar: require("@/assets/images/default-avatar.png"),
        commentsEnabled: true,
        comments: [],
    },
    {
        id: "2",
        name: "anitadmrc",
        message: "i'll give $20 to whoever does my homework",
        time: "4 hrs. ago",
        avatar: require("@/assets/images/default-avatar.png"),
        commentsEnabled: true,
        comments: [
            {
                id: "c1",
                username: "tinnguyen",
                text: "I got you bro",
                time: "3 hrs. ago",
                avatar: require("@/assets/images/default-avatar.png"),
            },
            {
                id: "c2",
                username: "nickfan",
                text: "lol same",
                time: "2 hrs. ago",
                avatar: require("@/assets/images/default-avatar.png"),
            },
        ],
    },
];

export default function SocialPage() {
    const { theme } = useTheme();
    const [data, setData] = useState<FeedItem[]>(initialData);
    const [likedItems, setLikedItems] = useState<string[]>([]);
    const [isAddPostModalVisible, setIsAddPostModalVisible] = useState(false);
    const [newPostText, setNewPostText] = useState("");
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");
    const router = useRouter();

    const { showNotifications } = useNotificationModal();

    const handleToggleLike = (id: string) => {
        setLikedItems((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleAddPost = () => {
        if (newPostText.trim()) {
            const newPost: FeedItem = {
                id: Date.now().toString(),
                name: "You",
                message: newPostText.trim(),
                time: "Just now",
                avatar: require("@/assets/images/default-avatar.png"),
                commentsEnabled: commentsEnabled,
                comments: [],
            };
            setData([newPost, ...data]);
            setNewPostText("");
            setCommentsEnabled(true);
            setIsAddPostModalVisible(false);
        }
    };

    const handleAddComment = (postId: string) => {
        if (commentText.trim()) {
            setData((prevData) =>
                prevData.map((post) => {
                    if (post.id === postId) {
                        const newComment: Comment = {
                            id: Date.now().toString(),
                            username: "You",
                            text: commentText.trim(),
                            time: "Just now",
                            avatar: require("@/assets/images/default-avatar.png"),
                        };
                        return {
                            ...post,
                            comments: [...post.comments, newComment],
                        };
                    }
                    return post;
                })
            );
            setCommentText("");
        }
    };

    const openCommentsModal = (postId: string) => {
        setSelectedPostId(postId);
        setIsCommentsModalVisible(true);
        setCommentText("");
    };

    const closeCommentsModal = () => {
        setIsCommentsModalVisible(false);
        setSelectedPostId(null);
        setCommentText("");
    };

    const selectedPost = data.find(post => post.id === selectedPostId);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Top Navigation Bar */}
            <HeaderBar
                title="Social"
                showTitle={true}
                onNotificationPress={showNotifications}
                onSettingsPress={() => { router.push("../settings") }}
            />

            {/* Add Post Button */}
            <TouchableOpacity
                style={[styles.addPostButton, { backgroundColor: theme.primary }]}
                onPress={() => setIsAddPostModalVisible(true)}
            >
                <Ionicons name="add" size={24} color={theme.background} />
                <Text style={[styles.addPostButtonText, { color: theme.background }]}>
                    Create Post
                </Text>
            </TouchableOpacity>

            {/* Feed List */}
            <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.feedList}
                renderItem={({ item }) => (
                    <FriendActivityItem
                        activity={{
                            id: item.id,
                            name: item.name,
                            message: item.message,
                            time: item.time,
                            img: item.avatar,
                        }}
                        theme={theme}
                        isLiked={likedItems.includes(item.id)}
                        onToggleLike={handleToggleLike}
                        onCommentPress={openCommentsModal}
                        commentsCount={item.comments.length}
                    />
                )}
            />

            {/* Comments Modal */}
            <Modal
                visible={isCommentsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeCommentsModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.commentsModalOverlay}
                >
                    <TouchableOpacity
                        style={styles.commentsModalBackdrop}
                        activeOpacity={1}
                        onPress={closeCommentsModal}
                    />
                    <View style={[styles.commentsModalContent, { backgroundColor: theme.cardBackground }]}>
                        {/* Header */}
                        <View style={[styles.commentsModalHeader, { borderBottomColor: theme.border }]}>
                            <Text style={[styles.commentsModalTitle, { color: theme.primary }]}>
                                Comments
                            </Text>
                            <TouchableOpacity onPress={closeCommentsModal}>
                                <Ionicons name="close" size={28} color={theme.primary} />
                            </TouchableOpacity>
                        </View>

                        {selectedPost && (
                            <>
                                {/* Post Preview */}
                                <View style={[styles.postPreview, { borderBottomColor: theme.border }]}>
                                    <Text style={[styles.postPreviewName, { color: theme.primary }]}>
                                        {selectedPost.name}
                                    </Text>
                                    <Text style={[styles.postPreviewMessage, { color: theme.primary }]}>
                                        {selectedPost.message}
                                    </Text>
                                </View>

                                {/* Comments List */}
                                <ScrollView style={styles.commentsListContainer}>
                                    {selectedPost.comments.length === 0 ? (
                                        <View style={styles.noCommentsContainer}>
                                            <Ionicons name="chatbubbles-outline" size={wp(15)} color={theme.border} />
                                            <Text style={[styles.noCommentsText, { color: theme.border }]}>
                                                No comments yet
                                            </Text>
                                            <Text style={[styles.noCommentsSubtext, { color: theme.border }]}>
                                                Be the first to comment!
                                            </Text>
                                        </View>
                                    ) : (
                                        selectedPost.comments.map((comment) => (
                                            <View key={comment.id} style={styles.commentItem}>
                                                <Image source={comment.avatar} style={styles.commentAvatar} />
                                                <View style={styles.commentContent}>
                                                    <Text style={[styles.commentText, { color: theme.primary }]}>
                                                        <Text style={styles.commentUsername}>
                                                            {comment.username}
                                                        </Text>
                                                        {" "}
                                                        <Text style={styles.commentMessage}>
                                                            {comment.text}
                                                        </Text>
                                                    </Text>
                                                    <Text style={[styles.commentTime, { color: theme.primary }]}>
                                                        {comment.time}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </ScrollView>

                                {/* Add Comment Input */}
                                {selectedPost.commentsEnabled ? (
                                    <View style={[styles.addCommentContainer, {
                                        borderTopColor: theme.border,
                                        backgroundColor: theme.cardBackground,
                                    }]}>
                                        <TextInput
                                            style={[styles.commentInput, {
                                                backgroundColor: theme.background,
                                                color: theme.primary,
                                                borderColor: theme.border,
                                            }]}
                                            placeholder="Write a comment..."
                                            placeholderTextColor={theme.border}
                                            value={commentText}
                                            onChangeText={setCommentText}
                                            multiline
                                        />
                                        <TouchableOpacity
                                            style={[styles.submitCommentButton, {
                                                backgroundColor: commentText.trim() ? theme.primary : theme.border
                                            }]}
                                            onPress={() => {
                                                handleAddComment(selectedPost.id);
                                            }}
                                            disabled={!commentText.trim()}
                                        >
                                            <Ionicons name="send" size={20} color={theme.background} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={[styles.commentsDisabledContainer, {
                                        borderTopColor: theme.border,
                                        backgroundColor: theme.background,
                                    }]}>
                                        <Ionicons name="lock-closed" size={20} color={theme.border} />
                                        <Text style={[styles.commentsDisabledText, { color: theme.border }]}>
                                            Comments are disabled for this post
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Add Post Modal */}
            <Modal
                visible={isAddPostModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsAddPostModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.primary }]}>Create Post</Text>
                            <TouchableOpacity onPress={() => setIsAddPostModalVisible(false)}>
                                <Ionicons name="close" size={28} color={theme.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <TextInput
                                style={[styles.postInput, {
                                    backgroundColor: theme.background,
                                    color: theme.primary,
                                    borderColor: theme.border,
                                }]}
                                placeholder="What's on your mind?"
                                placeholderTextColor={theme.border}
                                value={newPostText}
                                onChangeText={setNewPostText}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />

                            <View style={styles.toggleContainer}>
                                <Text style={[styles.toggleLabel, { color: theme.primary }]}>
                                    Allow Comments
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleButton,
                                        { backgroundColor: commentsEnabled ? theme.primary : theme.border }
                                    ]}
                                    onPress={() => setCommentsEnabled(!commentsEnabled)}
                                >
                                    <View style={[
                                        styles.toggleCircle,
                                        { backgroundColor: theme.background },
                                        commentsEnabled && styles.toggleCircleActive
                                    ]} />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.submitButton, {
                                backgroundColor: newPostText.trim() ? theme.primary : theme.border
                            }]}
                            onPress={handleAddPost}
                            disabled={!newPostText.trim()}
                        >
                            <Text style={[styles.submitButtonText, { color: theme.background }]}>
                                Post
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    addPostButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: wp(3),
        marginTop: hp(1),
        paddingVertical: hp(1.5),
        borderRadius: wp(2),
        gap: wp(2),
    },
    addPostButtonText: {
        fontSize: wp(4),
        fontWeight: "600",
    },
    feedList: {
        padding: wp(3),
        gap: hp(1.5),
    },
    commentItem: {
        flexDirection: "row",
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(2),
        gap: wp(3),
    },
    commentAvatar: {
        width: wp(8),
        height: wp(8),
        borderRadius: wp(4),
    },
    commentContent: {
        flex: 1,
    },
    commentUsername: {
        fontWeight: "700",
    },
    commentMessage: {
        fontWeight: "400",
    },
    commentText: {
        fontSize: wp(3.5),
        lineHeight: wp(5),
        marginBottom: hp(0.3),
    },
    commentTime: {
        fontSize: wp(3),
    },
    commentsModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    commentsModalBackdrop: {
        flex: 1,
    },
    commentsModalContent: {
        borderTopLeftRadius: wp(5),
        borderTopRightRadius: wp(5),
        maxHeight: hp(85),
        paddingBottom: hp(2),
    },
    commentsModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: wp(5),
        paddingVertical: hp(2),
        borderBottomWidth: 1,
    },
    commentsModalTitle: {
        fontSize: wp(5),
        fontWeight: "700",
    },
    postPreview: {
        paddingHorizontal: wp(5),
        paddingVertical: hp(2),
        borderBottomWidth: 1,
    },
    postPreviewName: {
        fontSize: wp(3.5),
        fontWeight: "600",
        marginBottom: hp(0.5),
    },
    postPreviewMessage: {
        fontSize: wp(3.5),
    },
    commentsListContainer: {
        maxHeight: hp(50),
        paddingHorizontal: wp(5),
    },
    noCommentsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: hp(5),
    },
    noCommentsText: {
        fontSize: wp(4.5),
        fontWeight: "600",
        marginTop: hp(2),
    },
    noCommentsSubtext: {
        fontSize: wp(3.5),
        marginTop: hp(0.5),
    },
    addCommentContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: wp(2),
        paddingHorizontal: wp(5),
        paddingTop: hp(1.5),
        paddingBottom: hp(1),
        borderTopWidth: 1,
    },
    commentsDisabledContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: wp(2),
        paddingVertical: hp(2),
        borderTopWidth: 1,
    },
    commentsDisabledText: {
        fontSize: wp(3.5),
        fontStyle: "italic",
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: wp(2),
        padding: wp(3),
        maxHeight: hp(12),
        fontSize: wp(3.5),
    },
    submitCommentButton: {
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
        justifyContent: "center",
        alignItems: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: wp(5),
        borderTopRightRadius: wp(5),
        paddingTop: hp(2),
        paddingBottom: hp(3),
        paddingHorizontal: wp(5),
        maxHeight: hp(80),
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: hp(2),
    },
    modalTitle: {
        fontSize: wp(5),
        fontWeight: "700",
    },
    modalBody: {
        marginBottom: hp(2),
    },
    postInput: {
        borderWidth: 1,
        borderRadius: wp(2),
        padding: wp(3),
        fontSize: wp(4),
        minHeight: hp(15),
        marginBottom: hp(2),
    },
    toggleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: hp(1),
    },
    toggleLabel: {
        fontSize: wp(4),
        fontWeight: "500",
    },
    toggleButton: {
        width: wp(12),
        height: hp(3),
        borderRadius: wp(6),
        justifyContent: "center",
        padding: wp(0.5),
    },
    toggleCircle: {
        width: wp(5),
        height: wp(5),
        borderRadius: wp(2.5),
    },
    toggleCircleActive: {
        alignSelf: "flex-end",
    },
    submitButton: {
        paddingVertical: hp(1.8),
        borderRadius: wp(2),
        alignItems: "center",
    },
    submitButtonText: {
        fontSize: wp(4.5),
        fontWeight: "700",
    },
});

