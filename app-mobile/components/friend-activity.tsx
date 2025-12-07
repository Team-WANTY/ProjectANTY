import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AvatarBubble } from "@/components/avatar-bubble";
import { formatRelativeTime } from "@/hooks/time";


const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const wp = (pct: number) => screenWidth * (pct / 100);
const hp = (pct: number) => screenHeight * (pct / 100);

interface FriendActivityItemProps {
    activity: {
        id: string;
        name: string;
        message: string;
        time: string;
        img: any;
        onEdit?: () => void;
    };
    theme: any;
    isLiked: boolean;
    onToggleLike: (id: string) => void;
    onCommentPress?: (id: string) => void;
    commentsCount?: number;
    themeName: string;
    commentCountColor?: string;
    postTextColor?: string;
}

const FriendActivityItem: React.FC<FriendActivityItemProps> = ({ activity, theme, isLiked, onToggleLike, onCommentPress, commentsCount, themeName, commentCountColor, postTextColor }) => {
    const { id, name, message, time, img, onEdit } = activity;
    const heartIconName = isLiked ? "heart" : "heart-outline";
    const heartIconColor = theme.background;
    const textColor = theme.onPrimary;
    const editIconColor = theme.background;
    return (
        <View style={[styles.friendCard, { backgroundColor: theme.border, shadowColor: theme.shadow }]}>
            <Image source={img} style={styles.friendAvatar} />

            <View style={styles.friendTextContent}>
                <Text style={[styles.friendMessage, { color: textColor }]}>
                    <Text style={[styles.friendName, { color: theme.onPrimary }]}>{name}</Text>
                    {"\n"}
                    {message}
                </Text>
            </View>

            <View style={styles.friendActions}>
                <TouchableOpacity
                    onPress={() => onToggleLike(id)}
                    style={styles.actionButton}
                >
                    <Ionicons
                        name={heartIconName}
                        size={wp(5)}
                        color={heartIconColor}
                    />
                </TouchableOpacity>
                {onCommentPress && (
                    <TouchableOpacity
                        onPress={() => onCommentPress(activity.id)}
                        style={styles.actionButton}
                    >
                        <Ionicons name="chatbubble-outline" size={wp(5)} color={heartIconColor} />
                        {(commentsCount ?? 0) > 0 && (
                            <View style={[styles.commentBadge, { backgroundColor: theme.primary }]}>
                                <Text style={[styles.commentBadgeText, { color: commentCountColor ?? theme.onBackground }]}>
                                    {commentsCount ?? 0}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
                {onEdit && (
                    <TouchableOpacity
                        onPress={onEdit}
                        style={styles.actionButton}
                    >
                        <Ionicons name="create-outline" size={wp(5)} color={editIconColor} />
                    </TouchableOpacity>
                )}
                <Text style={[styles.friendTime, { color: postTextColor ?? theme.onBackground }]}>
                    <Text style={[styles.friendTime, { color: theme.onPrimary }]}>
                        {activity.time}
                    </Text>
                </Text>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    friendCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: wp(2),
        padding: wp(3),
        marginVertical: hp(1),
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    friendAvatar: {
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
        marginRight: wp(3),
    },
    friendTextContent: {
        flex: 1,
    },
    friendName: {
        fontWeight: "bold",
        fontSize: wp(3.5),
    },
    friendMessage: {
        fontSize: wp(3.2),
        marginTop: hp(0.3),
    },
    friendActions: {
        alignItems: "center",
        marginLeft: wp(2),
    },
    actionButton: {
        marginBottom: hp(0.5),
        position: "relative",
    },
    commentBadge: {
        position: "absolute",
        top: -5,
        right: -8,
        minWidth: wp(4),
        height: wp(4),
        borderRadius: wp(2),
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: wp(0.5),
    },
    commentBadgeText: {
        fontSize: wp(2.5),
        fontWeight: "bold",
    },
    friendTime: {
        fontSize: wp(2.8),
    },
});

export default React.memo(FriendActivityItem);
