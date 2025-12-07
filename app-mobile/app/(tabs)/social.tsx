import React, {
    useState,
    useEffect,
    useCallback,
} from "react";
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
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar";
import { useNotificationModal } from "@/app/_layout";

import { useUserStore } from "@/services/stores/users-store";
import { useProfileStore } from "@/services/stores/profiles-store";
import { usePostsStore } from "@/services/stores/posts-store";

import { postsApi, type Post } from "@/services/api/posts-api";
import { commentsApi, type Comment } from "@/services/api/comments-api";
import { usersApi } from "@/services/api/users-api";
import { profileApi } from "@/services/api/profiles-api";
import { imagesApi } from "@/services/api/image-api";
import { loadPosts } from "@/services/bootstrap/bootstrap";

import FriendActivityItem from "@/components/friend-activity";
import { PostCreateModal } from "@/components/post-create-modal";
import { PostEditModal } from "@/components/post-edit-modal";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const wp = (pct: number) => (screenWidth * pct) / 100;
const hp = (pct: number) => (screenHeight * pct) / 100;

// ---------- Types ----------

type CreatorInfo = {
    id: string;
    username: string;
    avatarUrl: string | null;
};

type CommentUI = {
    id: string;
    creator: CreatorInfo;
    text: string;
    createdAt: string;
};

type FeedItem = {
    id: string; // post id
    creator: CreatorInfo;
    message: string;
    time: string;
    commentsEnabled: boolean;
    comments: CommentUI[];
};

// ---------- Helper functions ----------

function formatRelativeTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}

// Resolve username + avatarUrl for a given user
async function resolveCreatorInfo(
    targetUserId: string,
    currentUserId: string | null,
    currentUsername: string | null,
    currentAvatarUrl: string | null
    ): Promise<CreatorInfo> {
    // If it's me, use store values directly (no extra network hit)
    if (currentUserId && targetUserId === currentUserId) {
        return {
        id: targetUserId,
        username: currentUsername ?? "You",
        avatarUrl: currentAvatarUrl ?? null,
        };
    }

    let username = "Unknown user";
    let avatarUrl: string | null = null;

    try {
        const userRes = await usersApi.getById(targetUserId);
        if (userRes.ok && userRes.data) {
        username = userRes.data.username;
        }
    } catch (err) {
        console.warn("[SocialScreen] failed to resolve username", err);
    }

    try {
        const profileRes = await profileApi.getById(targetUserId);
        if (
        profileRes.ok &&
        profileRes.data &&
        (profileRes.data as any).avatar_image_id
        ) {
        const avatarImageId = (profileRes.data as any).avatar_image_id as string;
        const imgRes = await imagesApi.getUrl(avatarImageId);
        if (imgRes.ok && imgRes.data) {
            avatarUrl = imgRes.data;
        }
        }
    } catch (err) {
        console.warn("[SocialScreen] failed to resolve avatar", err);
    }

    return { id: targetUserId, username, avatarUrl };
}

// ---------- Component ----------

export default function SocialScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const { showNotifications } = useNotificationModal();

    // Global stores
    const userId = useUserStore((s) => s.userId);
    const username = useUserStore((s) => s.username);
    const avatarUrlSelf = useProfileStore((s) => s.avatarUrl);
    const posts = usePostsStore((s) => s.posts);

    // Local UI state
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [likedItems, setLikedItems] = useState<string[]>([]);

    const [isAddPostModalVisible, setIsAddPostModalVisible] = useState(false);
    const [newPostText, setNewPostText] = useState("");
    const [commentsEnabled, setCommentsEnabled] = useState(true);

    const [isEditPostModalVisible, setIsEditPostModalVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editPostText, setEditPostText] = useState("");

    const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");

    const [loadingFeed, setLoadingFeed] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);

    const [commentsByPost, setCommentsByPost] = useState<{
        [postId: string]: CommentUI[];
    }>({});

    const selectedPost = feed.find((p) => p.id === selectedPostId) ?? null;

    // Map Post (from store) -> FeedItem
    const mapPostToFeedItem = useCallback(
        async (post: Post): Promise<FeedItem> => {
            const creator = await resolveCreatorInfo(
                post.creator_id,
                userId,
                username,
                avatarUrlSelf
            );

            return {
                id: post.id,
                creator,
                message: post.text,
                time: formatRelativeTime(post.created_at),
                commentsEnabled: post.allow_comments,
                comments: [],
            };
        },
        [userId, username, avatarUrlSelf]
    );

    // Refresh posts in the store from backend
    const refreshPosts = useCallback(async () => {
        if (!userId) return;
        setLoadingFeed(true);
        try {
            await loadPosts(userId);
            console.log("[Social] Refresh Posts Success");
        } catch (err) {
            console.warn("[SocialScreen.refreshPosts] error:", err);
        } finally {
            setLoadingFeed(false);
        }
    }, [userId]);

    // On screen focus, refresh posts store
    useFocusEffect(
        useCallback(() => {
        refreshPosts();
        }, [refreshPosts])
    );

    // Whenever posts in the store change, re-derive the feed + likedItems
    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            if (!userId) {
                setFeed([]);
                setLikedItems([]);
                return;
            }

            try {
                const items = await Promise.all(posts.map((p) => mapPostToFeedItem(p)));
                if (!cancelled) {
                    setFeed(items);

                    const liked = posts
                        .filter((p) => p.liker_ids.includes(userId))
                        .map((p) => p.id);
                    setLikedItems(liked);
                }
                console.log("[Social] hydrate feed from store success");
            } catch (err) {
                console.warn("[Social] hydrate feed from store failed:", err);
            }
        };

        hydrate();
        return () => {
            cancelled = true;
        };
    }, [posts, userId, mapPostToFeedItem]);

    // ---------- Likes ----------

    const handleToggleLike = async (postId: string) => {
        if (!userId) return;

        const isLiked = likedItems.includes(postId);
        const body = {
            id: postId,
            liker: {
                id: userId,
                like: !isLiked,
            },
        };

        // Optimistic update in local UI only
        setLikedItems((prev) =>
            isLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
        );

        const res = await postsApi.update(body);
        console.log("[PostLike] Success");
        if (!res.ok) {
            // revert if failed
            setLikedItems((prev) =>
                !isLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
            );
            console.log("[PostLike] Failed");
        }
    };

    // ---------- Create Post ----------

    const handleAddPost = async () => {
        if (!userId) return;
        const trimmed = newPostText.trim();
        if (!trimmed) return;

        const body = {
            creator_id: userId,
            text: trimmed,
            image_ids: [],
            allow_comments: commentsEnabled,
        };

        const res = await postsApi.create(body);
        if (res.ok) {
            // Refresh store + derived UI
            console.log("[AddPost] Success");
            await refreshPosts();

            setNewPostText("");
            setCommentsEnabled(true);
            setIsAddPostModalVisible(false);
        } else {
            console.log("[AddPost] failed:", res.message);
        }
    };

    // ---------- Edit/Delete Post ----------

    const openEditPostModal = (postId: string) => {
        const target = feed.find((p) => p.id === postId);
        if (!target) return;

        setEditingPostId(postId);
        setEditPostText(target.message);
        setIsEditPostModalVisible(true);
    };

    const closeEditPostModal = () => {
        setEditingPostId(null);
        setEditPostText("");
        setIsEditPostModalVisible(false);
    };

    const handleSavePostEdits = async () => {
        if (!editingPostId) return;
        const trimmed = editPostText.trim();
        if (!trimmed) return;

        const res = await postsApi.update({
            id: editingPostId,
            text: trimmed,
        });

        if (res.ok) {
            console.log("[EditPost] Success");
            await refreshPosts();
            closeEditPostModal();
        } else {
            console.log("[EditPost] Failed:", res.message);
        }
    };

    const handleDeletePost = async () => {
        if (!editingPostId) return;

        const res = await postsApi.remove(editingPostId);
        if (res.ok) {
            console.log("[DeletePost] Success");
            await refreshPosts();
            closeEditPostModal();
        } else {
            console.log("[DeletePost] Failed:", res.message);
        }
    };

    // ---------- Comments ----------

    const openCommentsModal = async (postId: string) => {
        setSelectedPostId(postId);
        setIsCommentsModalVisible(true);
        setCommentText("");
        await loadCommentsForPost(postId);
    };

    const closeCommentsModal = () => {
        setIsCommentsModalVisible(false);
        setSelectedPostId(null);
        setCommentText("");
    };

    const loadCommentsForPost = async (postId: string) => {
        setLoadingComments(true);
        try {
            const pageRes = await commentsApi.listForContent(postId, 50);
        if (!pageRes.ok || !pageRes.data) {
            setCommentsByPost((prev) => ({
                ...prev,
                [postId]: [],
            }));
                // also clear on feed
            setFeed((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, comments: [] } : p
                )
            );
            return;
        }

        const ids = pageRes.data.ids ?? [];
        const commentResults = await Promise.all(
            ids.map((id) => commentsApi.getById(id))
        );

        const enriched: CommentUI[] = [];

        for (const res of commentResults) {
            if (!res.ok || !res.data) continue;
            const c: Comment = res.data;
            const creator = await resolveCreatorInfo(
                c.creator_id,
                userId,
                username,
                avatarUrlSelf
            );
            enriched.push({
                id: c.id,
                creator,
                text: c.text,
                createdAt: formatRelativeTime(c.created_at),
            });
        }

        setCommentsByPost((prev) => ({
            ...prev,
            [postId]: enriched,
        }));

        // Update feed's comments for that post
        setFeed((prev) =>
            prev.map((p) =>
            p.id === postId ? { ...p, comments: enriched } : p
            )
        );
        console.log("[LoadComments] Success");
        } catch (err) {
            console.warn("[LoadComments] Failed:", err);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!userId || !selectedPostId) return;
        const trimmed = commentText.trim();
        if (!trimmed) return;

        const body = {
            creator_id: userId,
            text: trimmed,
            parent_content_id: selectedPostId,
            parent_content_type: "post" as const,
        };

        const res = await commentsApi.create(body);
        if (res.ok) {
            setCommentText("");
            console.log("[AddComment] Success");
            await loadCommentsForPost(selectedPostId);
        } else {
            console.log("[AddComment] Failed:", res.message);
        }
    };

    // ---------- Render helpers ----------

    const renderCommentAvatar = (avatarUrl: string | null, uname: string) => {
        const initial = uname?.[0]?.toUpperCase() ?? "?";

        if (avatarUrl) {
        return (
            <Image source={{ uri: avatarUrl }} style={styles.commentAvatar} />
        );
        }

        return (
        <View
            style={[
            styles.commentAvatar,
            {
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
            },
            ]}
        >
            <Text
            style={{
                color: theme.onPrimary,
                fontWeight: "700",
            }}
            >
            {initial}
            </Text>
        </View>
        );
    };

    // ---------- Render ----------

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <HeaderBar
            title="Social"
            showTitle
            onNotificationPress={showNotifications}
            onSettingsPress={() => router.push("../settings")}
        />

        {/* Create Post Button */}
        <TouchableOpacity
            style={[styles.addPostButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsAddPostModalVisible(true)}
        >
            <Ionicons name="add" size={22} color={theme.background} />
            <Text
            style={[
                styles.addPostButtonText,
                { color: theme.background },
            ]}
            >
            Create Post
            </Text>
        </TouchableOpacity>

        {/* Feed */}
        <FlatList
            data={feed}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedList}
            ListEmptyComponent={
            !loadingFeed ? (
                <View style={styles.emptyContainer}>
                <Text style={{ color: theme.secondaryText }}>
                    No posts yet
                </Text>
                </View>
            ) : null
            }
            renderItem={({ item }) => {
            const canEdit = item.creator.id === userId;

            const card = (
                <FriendActivityItem
                activity={{
                    id: item.id,
                    name: item.creator.username,
                    message: item.message,
                    time: item.time,
                    img: item.creator.avatarUrl
                    ? { uri: item.creator.avatarUrl }
                    : undefined,
                }}
                theme={theme}
                isLiked={likedItems.includes(item.id)}
                onToggleLike={handleToggleLike}
                onCommentPress={openCommentsModal}
                commentsCount={item.comments.length}
                />
            );

            if (!canEdit) return card;

            // Allow editing via long press for the author's own posts
            return (
                <TouchableOpacity
                activeOpacity={0.95}
                onLongPress={() => openEditPostModal(item.id)}
                >
                {card}
                </TouchableOpacity>
            );
            }}
        />

        {/* Comments Modal */}
        <Modal
            visible={isCommentsModalVisible}
            transparent
            animationType="slide"
            onRequestClose={closeCommentsModal}
        >
            <KeyboardAvoidingView
            style={styles.commentsModalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
            <TouchableOpacity
                style={styles.commentsModalBackdrop}
                activeOpacity={1}
                onPress={closeCommentsModal}
            />
            <View
                style={[
                styles.commentsModalContent,
                { backgroundColor: theme.cardBackground },
                ]}
            >
                {/* Header */}
                <View
                style={[
                    styles.commentsModalHeader,
                    { borderBottomColor: theme.border },
                ]}
                >
                <Text
                    style={[
                    styles.commentsModalTitle,
                    { color: theme.text },
                    ]}
                >
                    Comments
                </Text>
                <TouchableOpacity onPress={closeCommentsModal}>
                    <Ionicons
                    name="close"
                    size={26}
                    color={theme.primary}
                    />
                </TouchableOpacity>
                </View>

                {/* Comments list */}
                <ScrollView style={styles.commentsList}>
                {selectedPost &&
                    selectedPost.comments.map((c) => (
                    <View
                        key={c.id}
                        style={[
                        styles.commentItem,
                        { borderBottomColor: theme.border },
                        ]}
                    >
                        {renderCommentAvatar(
                        c.creator.avatarUrl,
                        c.creator.username
                        )}
                        <View style={styles.commentBody}>
                        <View style={styles.commentHeaderRow}>
                            <Text
                            style={[
                                styles.commentAuthor,
                                { color: theme.text },
                            ]}
                            >
                            {c.creator.username}
                            </Text>
                            <Text
                            style={[
                                styles.commentTime,
                                { color: theme.secondaryText },
                            ]}
                            >
                            {c.createdAt}
                            </Text>
                        </View>
                        <Text
                            style={[
                            styles.commentText,
                            { color: theme.text },
                            ]}
                        >
                            {c.text}
                        </Text>
                        </View>
                    </View>
                    ))}

                {selectedPost &&
                    selectedPost.comments.length === 0 &&
                    !loadingComments && (
                    <View style={styles.emptyComments}>
                        <Text style={{ color: theme.secondaryText }}>
                        No comments yet
                        </Text>
                    </View>
                    )}

                {loadingComments && (
                    <View style={styles.emptyComments}>
                    <Text style={{ color: theme.secondaryText }}>
                        Loading comments...
                    </Text>
                    </View>
                )}
                </ScrollView>

                {/* Add comment */}
                <View
                style={[
                    styles.commentInputRow,
                    { borderTopColor: theme.border },
                ]}
                >
                <TextInput
                    style={[
                    styles.commentInput,
                    {
                        borderColor: theme.border,
                        color: theme.text,
                    },
                    ]}
                    placeholder="Add a comment..."
                    placeholderTextColor={theme.secondaryText}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                />
                <TouchableOpacity
                    style={styles.commentSendButton}
                    onPress={handleAddComment}
                    disabled={!commentText.trim()}
                >
                    <Ionicons
                    name="send"
                    size={22}
                    color={
                        commentText.trim()
                        ? theme.primary
                        : theme.border
                    }
                    />
                </TouchableOpacity>
                </View>
            </View>
            </KeyboardAvoidingView>
        </Modal>

        {/* Create Post Modal */}
        <PostCreateModal
            visible={isAddPostModalVisible}
            theme={theme}
            text={newPostText}
            commentsEnabled={commentsEnabled}
            onChangeText={setNewPostText}
            onToggleComments={() =>
            setCommentsEnabled((prev) => !prev)
            }
            onClose={() => setIsAddPostModalVisible(false)}
            onSubmit={handleAddPost}
        />

        {/* Edit Post Modal */}
        <PostEditModal
            visible={isEditPostModalVisible}
            theme={theme}
            text={editPostText}
            onChangeText={setEditPostText}
            onClose={closeEditPostModal}
            onSave={handleSavePostEdits}
            onDelete={handleDeletePost}
        />
        </View>
    );
}

    // ---------- Styles ----------

    const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    addPostButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: wp(5),
        marginTop: hp(2),
        marginBottom: hp(1),
        paddingVertical: hp(1.5),
        borderRadius: wp(3),
    },
    addPostButtonText: {
        marginLeft: wp(2),
        fontSize: wp(4),
        fontWeight: "600",
    },
    feedList: {
        paddingHorizontal: wp(4),
        paddingBottom: hp(4),
    },
    emptyContainer: {
        padding: hp(4),
        alignItems: "center",
    },

    // Comments modal
    commentsModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    commentsModalBackdrop: {
        flex: 1,
    },
    commentsModalContent: {
        maxHeight: screenHeight * 0.7,
        borderTopLeftRadius: wp(5),
        borderTopRightRadius: wp(5),
        paddingHorizontal: wp(5),
        paddingTop: hp(2),
        paddingBottom: hp(2),
    },
    commentsModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: hp(1),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentsModalTitle: {
        fontSize: wp(5),
        fontWeight: "700",
    },
    commentsList: {
        marginTop: hp(1.5),
        marginBottom: hp(1),
    },
    commentItem: {
        flexDirection: "row",
        paddingVertical: hp(1.2),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentAvatar: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        marginRight: wp(3),
    },
    commentBody: {
        flex: 1,
    },
    commentHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 2,
    },
    commentAuthor: {
        fontSize: wp(3.8),
        fontWeight: "600",
    },
    commentTime: {
        fontSize: wp(3),
    },
    commentText: {
        fontSize: wp(3.6),
        marginTop: 2,
    },
    emptyComments: {
        paddingVertical: hp(2),
        alignItems: "center",
    },
    commentInputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingTop: hp(1),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    commentInput: {
        flex: 1,
        minHeight: hp(5),
        maxHeight: hp(15),
        borderWidth: 1,
        borderRadius: wp(3),
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        fontSize: wp(3.6),
        marginRight: wp(2),
    },
    commentSendButton: {
        paddingHorizontal: wp(1),
        paddingVertical: hp(0.5),
    },
});
