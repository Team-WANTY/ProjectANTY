import React from "react";
import {
    View,
    Text,
    Modal,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AvatarBubble } from "@/components/avatar-bubble";

import type { Comment } from "@/services/api/comments-api";

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

type CreatorInfo = {
    id: string;
    username: string;
    avatarUrl: string | null;
};

type CommentsModalProps = {
    visible: boolean;
    theme: any;
    comments: Comment[];
    creatorsById: Record<string, CreatorInfo>;
    userId: string | null;

    loadingComments: boolean;
    commentText: string;
    editingCommentId: string | null;

    onChangeCommentText: (text: string) => void;
    onClose: () => void;
    onStartEditComment: (comment: Comment) => void;
    onDeleteComment: (commentId: string) => void;
    onSubmitComment: () => void;
};

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  theme,
  comments,
  creatorsById,
  userId,
  loadingComments,
  commentText,
  editingCommentId,
  onChangeCommentText,
  onClose,
  onStartEditComment,
  onDeleteComment,
  onSubmitComment,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.commentsModalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity style={styles.commentsModalBackdrop} activeOpacity={1} onPress={onClose}/>
        <View style={[styles.commentsModalContent, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={[ styles.commentsModalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[ styles.commentsModalTitle, { color: theme.text }]}> Comments </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color={theme.primary}/>
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <FlatList
            style={styles.commentsList}
            data={comments}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              loadingComments ? (
                <View style={styles.emptyComments}>
                  <Text style={{color: theme.secondaryText}}>Loading comments...</Text>
                </View>
              ) : (
                <View style={styles.emptyComments}>
                  <Text style={{color: theme.secondaryText}}>No comments yet</Text>
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
                  <View style={[styles.commentItem, {borderBottomColor: theme.border}]}>
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
                        <View style={{flexDirection: "row", alignItems: "flex-end"}}>
                          <Text style={[styles.commentAuthor, { color: theme.text }]}>{creator.username}</Text>
                          <Text style={[styles.commentTime, {color: theme.secondaryText}]}>
                            {"  · "}{formatRelativeTime(c.created_at)}
                          </Text>
                        </View>
                        {isMine && (
                          <View style={styles.commentActionsRow}>
                            <TouchableOpacity onPress={() => onStartEditComment(c)} style={{marginRight: 8}}>
                              <Ionicons name="create-outline" size={18} color={theme.primary }/>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onDeleteComment(c.id)}>
                              <Ionicons name="trash-outline" size={18} color="#ff002bff"/>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    <Text style={[styles.commentText, { color: theme.text }]}>{c.text}</Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Add / Edit comment */}
          <View style={[styles.commentInputRow, { borderTopColor: theme.border }]}>
            <TextInput 
              style={[styles.commentInput, {borderColor: theme.border, color: theme.text}]}
              placeholder={editingCommentId ? "Edit your comment..." : "Add a comment..."}
              placeholderTextColor={theme.secondaryText}
              value={commentText}
              onChangeText={onChangeCommentText}
              multiline
            />
            <TouchableOpacity style={styles.commentSendButton} onPress={onSubmitComment} disabled={!commentText.trim()}>
              <Ionicons name={editingCommentId ? "checkmark" : "send"} size={22} color={ commentText.trim() ? theme.primary : theme.border}/>
            </TouchableOpacity>
          </View>
        </View> 
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  commentsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  commentsModalBackdrop: {
    flex: 1,
  },
  commentsModalContent: {
    maxHeight: Dimensions.get("window").height * 0.7,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  commentsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentsModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  commentsList: {
    marginTop: 8,
    marginBottom: 8,
  },
  commentItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentAvatar: {
    marginRight: 10,
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
    fontSize: 14,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyComments: {
    paddingVertical: 16,
    alignItems: "center",
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    marginRight: 8,
  },
  commentSendButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  commentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
