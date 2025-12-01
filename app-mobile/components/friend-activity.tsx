import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const wp = (pct: number) => screenWidth * (pct / 100);
const hp = (pct: number) => screenHeight * (pct / 100);

const FriendActivityItem = ({ activity, theme, isLiked, onToggleLike }) => {
    const heartIconName = isLiked ? "heart" : "heart-outline";
    const heartIconColor = theme.background;

    return (
        <View style={[styles.friendCard, { backgroundColor: theme.border, shadowColor: theme.shadow }]}>
            <Image source={activity.img} style={styles.friendAvatar} />

            <View style={styles.friendTextContent}>
                <Text style={[styles.friendMessage, { color: theme.background }]}>
                    <Text style={styles.friendName}>{activity.name}</Text>
                    {"\n"}
                    {activity.message}
                </Text>
            </View>

            <View style={styles.friendActions}>
                <TouchableOpacity
                    onPress={() => onToggleLike(activity.id)}
                    style={styles.heartButton}
                >
                    <Ionicons name={heartIconName} size={wp(5)} color={heartIconColor} />
                </TouchableOpacity>
                <Text style={[styles.friendTime, { color: theme.background }]}>
                    {activity.time}
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
    heartButton: {
        marginBottom: hp(0.5),
    },
    friendTime: {
        fontSize: wp(2.8),
    },
});

export default FriendActivityItem;
