import React, { useState } from "react";
import {
    View,
    StyleSheet,
    FlatList,
    Dimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar";
import FriendActivityItem from "@/components/friend-activity";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Relative sizing helpers
const wp = (pct: number) => screenWidth * (pct / 100);
const hp = (pct: number) => screenHeight * (pct / 100);

interface FeedItem {
    id: string;
    name: string;
    message: string;
    time: string;
    avatar: any;
    comments?: number;
}

const data: FeedItem[] = [
    {
        id: "1",
        name: "tinnguyen",
        message: "Just took a nap",
        time: "2 hrs. ago",
        avatar: require("@/assets/images/default-avatar.png"),
    },
    {
        id: "2",
        name: "anitadmrc",
        message: "i’ll give $20 to whoever does my homework",
        time: "4 hrs. ago",
        avatar: require("@/assets/images/default-avatar.png"),
        comments: 2,
    },
];

export default function SocialPage() {
    const { theme } = useTheme();
    const [likedItems, setLikedItems] = useState<string[]>([]);

    const handleToggleLike = (id: string) => {
        setLikedItems((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Top Navigation Bar */}
            <HeaderBar
                title="Social"
                showTitle={true}
                onNotificationPress={() => { /* navigate to notifications */ }}
                onSettingsPress={() => { /* navigate to settings */ }}
            />

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
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    feedList: {
        padding: wp(3),
        gap: hp(1.5),
    },
});

