import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
}

const FriendActivityItem: React.FC<FriendActivityItemProps> = ({ activity, theme, isLiked, onToggleLike, onCommentPress, commentsCount, themeName }) => {
    const { id, name, message, time, img, onEdit } = activity;
    const heartIconName = isLiked ? "heart" : "heart-outline";
    const heartIconColor = theme.background;
    const purple = '#6c63a2';
    const textColor = themeName === 'lilac' ? purple : theme.background;
    const editIconColor = themeName === 'dark' ? '#000' : (themeName === 'light' || themeName === 'lilac') ? '#fff' : theme.primary;
    return (
        <View style={[styles.friendCard, { backgroundColor: theme.border, shadowColor: theme.shadow }]}> 
            <Image source={img} style={styles.friendAvatar} />

            <View style={styles.friendTextContent}> 
                <Text style={[styles.friendMessage, { color: textColor }]}> 
                    <Text style={styles.friendName}>{name}</Text>
                    {"\n"}
                    {message}
                </Text>
            </View>

            <View style={styles.friendActions}> 
                <TouchableOpacity
                    onPress={() => onToggleLike(id)}
                    style={styles.actionButton}
                >
                    <Ionicons name={heartIconName} size={wp(5)} color={heartIconColor} />
                </TouchableOpacity>
<<<<<<< Updated upstream
                <TouchableOpacity
                    onPress={() => onCommentPress(activity.id)}
                    style={styles.actionButton}
                >
                    <Ionicons name="chatbubble-outline" size={wp(5)} color={heartIconColor} />
                    {commentsCount > 0 && (
                        <View style={[styles.commentBadge, { backgroundColor: theme.primary }]}> 
                            <Text style={[styles.commentBadgeText, { color: theme.background }]}> 
                                {commentsCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={[styles.friendTime, { color: theme.background }]}> 
                    {activity.time}
=======
                {onCommentPress && commentsCount !== undefined && (
                    <TouchableOpacity
                        onPress={() => onCommentPress(id)}
                        style={styles.actionButton}
                    >
                        <Ionicons name="chatbubble-outline" size={wp(5)} color={heartIconColor} />
                        {commentsCount > 0 && (
                            <View style={[styles.commentBadge, { backgroundColor: theme.primary }]}> 
                                <Text style={[styles.commentBadgeText, { color: themeName === 'blue' ? '#AECDD9' : theme.background }]}> 
                                    {commentsCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
                {/* Edit icon only for own posts */}
                {name === 'You' && onEdit && (
                    <TouchableOpacity
                        onPress={onEdit}
                        style={[styles.actionButton, { marginLeft: wp(1) }]}
                    >
                        <Ionicons name="create-outline" size={wp(5)} color={editIconColor} />
                    </TouchableOpacity>
                )}
                <Text style={[styles.friendTime, { color: textColor }]}> 
                    {time}
>>>>>>> Stashed changes
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
        shadowColor: "#000",
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

export default FriendActivityItem;
