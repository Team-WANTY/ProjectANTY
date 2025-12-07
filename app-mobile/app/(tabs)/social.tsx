import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
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
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar";
import { useNotificationModal } from "@/app/_layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUserStore } from "@/services/stores/users-store";
import { useProfileStore } from "@/services/stores/profiles-store";
import { usePostsStore } from "@/services/stores/posts-store";
import { useCommentsStore } from "@/services/stores/comments-store";
import { useCreatorsStore } from "@/services/stores/creators-store";

import { postsApi, type Post } from "@/services/api/posts-api";
import { commentsApi, type Comment } from "@/services/api/comments-api";
import { loadPosts, loadCommentsForPosts, loadCommentsForPost } from "@/services/bootstrap/bootstrap";
import FriendActivityItem from "@/components/friend-activity";
import { PostCreateModal } from "@/components/post-create-modal";
import { PostEditModal } from "@/components/post-edit-modal";
import { AvatarBubble } from "@/components/avatar-bubble";

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

// Internal version that keeps references to source post/comments
type InternalFeedItem = FeedItem & {
    _rawPost?: Post;
    _rawComments?: Comment[];
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


// ---------- Component ----------

export default function SocialScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const { showNotifications } = useNotificationModal();
    const insets = useSafeAreaInsets();

    // Global stores
    const userId = useUserStore((s) => s.userId);
    const username = useUserStore((s) => s.username);
    const avatarUrlSelf = useProfileStore((s) => s.avatarUrl);
    const posts = usePostsStore((s) => s.posts);
    const commentsByParent = useCommentsStore((s) => s.commentsByParent);
    const creatorsById = useCreatorsStore((s) => s.byId);
    const removePost = usePostsStore((s) => s.removePost);
    const updatePost = usePostsStore((s) => s.updatePost);
    const insertPost = usePostsStore((s) => s.insertPost);
    const insertComment = useCommentsStore((s) => s.insertComment);
    const updateCommentInStore = useCommentsStore((s) => s.updateComment);
    const removeCommentFromStore = useCommentsStore((s) => s.removeComment);

    // Local UI state
    const [feed, setFeed] = useState<InternalFeedItem[]>([]);

    const [isAddPostModalVisible, setIsAddPostModalVisible] = useState(false);
    const [newPostText, setNewPostText] = useState("");
    const [commentsEnabled, setCommentsEnabled] = useState(true);

    const [isEditPostModalVisible, setIsEditPostModalVisible] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editPostText, setEditPostText] = useState("");

    const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

    const [loadingFeed, setLoadingFeed] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);

    const commentsForSelectedPost: Comment[] = selectedPostId ? commentsByParent[selectedPostId] ?? [] : [];

    const lastRefreshAtRef = useRef<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Map Post (from store) -> FeedItem
    const mapPostToFeedItem = useCallback(
        (post: Post, commentsForPost?: Comment[]): FeedItem => {
            const meId = userId;
            const fallbackCreator = (id: string): CreatorInfo => {
                if (meId && id === meId) {
                    return {
                        id,
                        username: username ?? "You",
                        avatarUrl: avatarUrlSelf ?? null,
                    };
                }
                return { id, username: "Unknown user", avatarUrl: null };
            };
            const creator = creatorsById[post.creator_id] ?? fallbackCreator(post.creator_id);

            const comments: CommentUI[] = (commentsForPost ?? []).map((c) => {
                const cCreator = creatorsById[c.creator_id] ?? fallbackCreator(c.creator_id);

                return {
                    id: c.id,
                    creator: cCreator,
                    text: c.text,
                    createdAt: formatRelativeTime(c.created_at),
                };
            });

            return {
                id: post.id,
                creator,
                message: post.text,
                time: formatRelativeTime(post.created_at),
                commentsEnabled: post.allow_comments,
                comments,
            };
        },
        [creatorsById, userId, username, avatarUrlSelf]
    );

    // Refresh posts in the store from backend
    const refreshPosts = useCallback(
        async (options?: { force?: boolean }) => {
            if (!userId) return;

            const now = Date.now();
            const last = lastRefreshAtRef.current;
            // Throttle if not forced and last refresh was < 30s ago
            if (!options?.force && last && now - last < 30_000) {
                console.log("[Social] Skip refresh (throttled within 30s)");
                return;
            }

            setLoadingFeed(true);
            try {
                // Always use *current* posts from the store, not the closure
                const currentPosts = usePostsStore.getState().posts;
                let newestPostCreatedAt: string | null = null;
                if (currentPosts.length > 0) {
                    // Sort to be safe in case posts arrived out of order
                    const sorted = [...currentPosts].sort((a, b) =>
                        a.created_at < b.created_at ? 1 : -1
                    );
                    newestPostCreatedAt = sorted[0].created_at;
                }

                await loadPosts(userId, { since: newestPostCreatedAt });
                await loadCommentsForPosts();

                lastRefreshAtRef.current = now;
                console.log("[Social] Refresh Posts & Comments Success");
            } catch (err) {
                console.warn("[Social] Refresh Posts & Comments Failed:", err);
            } finally {
                setLoadingFeed(false);
            }
        }, 
        [userId]
    );

    const sortedPosts = useMemo(() => [...posts].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), [posts]);
    const likedItems = useMemo(
        () => !userId ? [] : sortedPosts.filter((p) => p.liker_ids.includes(userId)).map((p) => p.id),[sortedPosts, userId]);


    useEffect(() => {
        refreshPosts({ force: true });
    }, [refreshPosts]);

    useEffect(() => {
        if (!userId) {
            setFeed([]);
            return;
        }

        try {
            setFeed((prev) => {
                const prevById = new Map<string, InternalFeedItem>(prev.map((item) => [item.id, item]));
                const next: InternalFeedItem[] = [];

                for (const p of sortedPosts) {
                    const prevItem = prevById.get(p.id);
                    const newComments = commentsByParent[p.id] ?? [];
                    const prevPost = prevItem?._rawPost;
                    const prevComments = prevItem?._rawComments;

                    const samePost = prevPost === p;
                    const sameComments = prevComments === newComments;

                    if (prevItem && samePost && sameComments) {
                        // Nothing changed, reuse existing FeedItem to avoid re-renders
                        next.push(prevItem);
                    } else {
                        // Something changed -> remap
                        const item = mapPostToFeedItem(p, newComments) as InternalFeedItem;
                        item._rawPost = p;
                        item._rawComments = newComments;
                        next.push(item);
                    }
                }

                return next;
            });
        } catch (err) {
            console.warn("[Social] hydrate feed from store failed:", err);
        }
    }, [sortedPosts, commentsByParent, userId, mapPostToFeedItem]);

    // ---------- Likes ----------

    const handleToggleLike = async (postId: string) => {
        if (!userId) return;

        // use derived likedItems to know current state
        const isLiked = likedItems.includes(postId);

        // get current post + its liker_ids from the store
        const postsState = usePostsStore.getState();
        const target = postsState.posts.find((p) => p.id === postId);
        if (!target) return;

        const originalLikerIds = target.liker_ids ?? [];

        // build optimistic liker_ids
        const optimisticLikerIds = isLiked ? originalLikerIds.filter((id) => id !== userId) : [...originalLikerIds, userId];

        const body = {
            id: postId,
            liker: {
                id: userId,
                like: !isLiked,
            },
        };

        // Optimistic update in the store
        updatePost(postId, { liker_ids: optimisticLikerIds });

        const res = await postsApi.update(body);
        if (!res.ok) {
            console.log("[PostLike] Failed, reverting");
            // Revert to original liker_ids
            updatePost(postId, { liker_ids: originalLikerIds });
        } else {
            console.log("[PostLike] Success");
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

        const createRes = await postsApi.create(body);
        if (!createRes.ok || !createRes.data) {
            console.warn("[AddPost] Failed to create:", createRes.message);
            return;
        }

        const newPostId = createRes.data; // string, not null

        // Fetch full post by ID
        const getRes = await postsApi.getById(newPostId);
        if (!getRes.ok || !getRes.data) {
            console.warn("[AddPost] Failed to load created post:", getRes.message);
            return;
        }
        console.log("[AddPost] Success");
        // Insert into store
        insertPost(getRes.data);

        // Reset modal
        setNewPostText("");
        setCommentsEnabled(true);
        setIsAddPostModalVisible(false);
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

        const res = await postsApi.update({ id: editingPostId, text: trimmed });

        if (res.ok) {
            console.log("[EditPost] Success");

            // fetch the fresh post from backend and upsert into store
            const getRes = await postsApi.getById(editingPostId);
            if (getRes.ok && getRes.data) {
                insertPost(getRes.data); // upsert full post
            } else {
                // Fallback: update text locally
                updatePost(editingPostId, { text: trimmed });
                console.warn("[EditPost] Failed to fetch updated post:", getRes.message);
            }
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
            removePost(editingPostId);
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
        setLoadingComments(true);
        setEditingCommentId(null);
        try {
            await loadCommentsForPost(postId, 50); // updates comments-store
            console.log("[Social] Loaded comments for post:", postId);
        } catch (err) {
            console.warn("[Social] Failed to load comments for post:", err);
        } finally {
            setLoadingComments(false);
        }
    };

    const closeCommentsModal = () => {
        setIsCommentsModalVisible(false);
        setSelectedPostId(null);
        setCommentText("");
        setEditingCommentId(null);
    };

    
    const startEditComment = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setCommentText(comment.text);
    };

    const handleDeleteComment = async (commentId: string) => {
        const res = await commentsApi.remove(commentId);
        if (res.ok) {
            console.log("[DeleteComment] Success");
            removeCommentFromStore(commentId);
            if (editingCommentId === commentId) {
                setEditingCommentId(null);
                setCommentText("");
            }
        } else {
            console.log("[DeleteComment] Failed:", res.message);
        }
    };

    const handleSubmitComment = async () => {
        if (!userId || !selectedPostId) return;
        const trimmed = commentText.trim();
        if (!trimmed) return;

        // EDIT existing comment
        if (editingCommentId) {
            const res = await commentsApi.update({ id: editingCommentId, text: trimmed });
            if (res.ok) {
                updateCommentInStore(editingCommentId, { text: trimmed });
                console.log("[EditComment] Success");
                setEditingCommentId(null);
                setCommentText("");
            } else {
                console.log("[EditComment] Failed:", res.message);
            }
            return;
        }

        // CREATE new comment
        const body = {
            creator_id: userId,
            text: trimmed,
            parent_content_id: selectedPostId,
            parent_content_type: "post" as const,
        };

        const res = await commentsApi.create(body);
        if (!res.ok) {
            console.log("[AddComment] Failed to Post comment");
            return;
        }
        setLoadingComments(true);
        const full = await commentsApi.getById(res.data);
        if (!full.ok) {
            console.log("[AddComment] Failed to load full comment");
            return;
        }
        console.log("[AddComment] Success");
        insertComment(full.data);
        setCommentText("");
        setLoadingComments(false);
    };

    // ---------- Render helpers ----------
    const renderFeedItem = useCallback(
        ({ item }: { item: InternalFeedItem }) => {
            const canEdit = item.creator.id === userId;
            const commentsCount = commentsByParent[item.id]?.length ?? 0;

            const card = (
                <FriendActivityItem
                    activity={{
                        id: item.id,
                        name: item.creator.username,
                        message: item.message,
                        time: item.time,
                        avatarUrl: item.creator.avatarUrl,
                    }}
                    theme={theme}
                    isLiked={likedItems.includes(item.id)}
                    onToggleLike={handleToggleLike}
                    onCommentPress={openCommentsModal}
                    commentsCount={commentsCount}
                />
            );

            if (!canEdit) return card;

            return (
                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => openEditPostModal(item.id)}
                >
                    {card}
                </TouchableOpacity>
            );
        },
        [
            userId,
            commentsByParent,
            theme,
            likedItems,
            handleToggleLike,
            openCommentsModal,
            openEditPostModal,
        ]
    );

    // ---------- Render ----------
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <HeaderBar title="Social" showTitle onNotificationPress={showNotifications} onSettingsPress={() => router.push("../settings")} />

            {/* Create Post Button */}
            <TouchableOpacity style={[styles.addPostButton, { backgroundColor: theme.primary }]} onPress={() => setIsAddPostModalVisible(true)}>
                <Ionicons name="add" size={22} color={theme.background} />
                <Text style={[ styles.addPostButtonText, { color: theme.background }]} > Create Post </Text>
            </TouchableOpacity>

            {/* Feed */}
            <FlatList
                style={{ flex: 1 }}
                data={feed}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.feedList, {paddingBottom: insets.bottom + hp(10)}]}
                refreshing={refreshing}
                onRefresh={async () => {
                    setRefreshing(true);
                    try {
                        await refreshPosts({ force: true });
                    } finally {
                        setRefreshing(false);
                    }
                }}

                ListEmptyComponent={
                    !loadingFeed ? (
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.secondaryText }}> No posts yet </Text>
                        </View>
                    ) : null
                }

                renderItem={renderFeedItem}
            />

            {/* Comments Modal */}
            <Modal visible={isCommentsModalVisible} transparent animationType="slide" onRequestClose={closeCommentsModal}>
                <KeyboardAvoidingView style={styles.commentsModalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <TouchableOpacity style={styles.commentsModalBackdrop} activeOpacity={1} onPress={closeCommentsModal}/>
                    <View style={[ styles.commentsModalContent, { backgroundColor: theme.cardBackground }]}>
                        {/* Header */}
                        <View style={[ styles.commentsModalHeader, { borderBottomColor: theme.border }]}>
                            <Text style={[ styles.commentsModalTitle, { color: theme.text }, ]}> Comments </Text>
                            <TouchableOpacity onPress={closeCommentsModal}>
                                <Ionicons name="close" size={26} color={theme.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Comments list */}
                        <FlatList 
                            style={styles.commentsList}
                            data={commentsForSelectedPost}
                            keyExtractor={(item) => item.id}
                            ListEmptyComponent={
                                loadingComments ? (
                                    <View style={styles.emptyComments}>
                                        <Text style={{ color: theme.secondaryText }}> Loading comments... </Text>
                                    </View>
                                ) : (
                                    <View style={styles.emptyComments}>
                                        <Text style={{ color: theme.secondaryText }}> No comments yet </Text>
                                    </View>
                                )
                            }
                            renderItem={({ item: c }) => {
                                const creator =
                                    creatorsById[c.creator_id] ?? {
                                        id: c.creator_id,
                                        username: "Unknown user",
                                        avatarUrl: null,
                                    };
                                const isMine = c.creator_id === userId;
                                return (
                                    <View key={c.id} style={[ styles.commentItem, { borderBottomColor: theme.border }]}>
                                        <AvatarBubble
                                            size={36}
                                            avatarUrl={creator.avatarUrl}
                                            name={creator.username}
                                            bgColor={theme.primary}
                                            initialColor={theme.onPrimary}
                                            style={styles.commentAvatar}
                                        />
                                        <View style={styles.commentBody}>
                                            <View style={styles.commentHeaderRow}>
                                                <View style={{ flexDirection: "row", alignItems: "flex-end"  }}>
                                                    <Text style={[ styles.commentAuthor, { color: theme.text }]}> {creator.username} </Text>
                                                    <Text style={[ styles.commentTime, { color: theme.secondaryText }]}> {"  · "}{formatRelativeTime(c.created_at)}</Text>
                                                </View>
                                                {isMine && (
                                                    <View style={styles.commentActionsRow}>
                                                        <TouchableOpacity onPress={() => startEditComment(c) } style={{ marginRight: 8}}>
                                                            <Ionicons name="create-outline" size={18} color= {theme.primary}/>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity  onPress={() => handleDeleteComment(c.id)}>
                                                            <Ionicons name="trash-outline" size={18} color= "#ff002bff"/>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[ styles.commentText, { color: theme.text }]}> {c.text}</Text>
                                        </View>
                                    </View>
                                );
                            }}
                        />

                        {/* Add / Edit comment */}
                        <View
                            style={[ styles.commentInputRow, { borderTopColor: theme.border }]}>
                            <TextInput
                                style={[ styles.commentInput, { borderColor: theme.border,color: theme.text }]}
                                placeholder={editingCommentId ? "Edit your comment..." : "Add a comment..." }
                                placeholderTextColor={theme.secondaryText}
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                            />
                            <TouchableOpacity style={styles.commentSendButton} onPress={handleSubmitComment} disabled={!commentText.trim()}>
                                <Ionicons name={editingCommentId ? "checkmark" : "send"} size={22} color={ commentText.trim() ? theme.primary: theme.border }/>
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
                onToggleComments={() => setCommentsEnabled((prev) => !prev)}
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
        commentActionsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
});
