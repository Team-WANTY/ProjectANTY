import React, { useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { HeaderBar } from "@/components/header-bar";
import FriendActivityItem from "@/components/friend-activity";

const { width } = Dimensions.get("window");

// --- NEW Mock Data for Carousel ---
const dashboardItems = [
    { id: 1, label: "Current Task Progress", tasksDone: 4, tasksTotal: 12, percent: 33, colorKey: 'background' },
    { id: 2, label: "Weekly Focus Score", tasksDone: 80, tasksTotal: 100, percent: 80, colorKey: 'primary' },
    { id: 3, label: "Upcoming Deadlines", tasksDone: 3, tasksTotal: 5, percent: 60, colorKey: 'secondary' },
];

// --- Mock Data for Friend Activity (Unchanged) ---
const friendActivities = [
    { id: 1, name: "tinnguyen", message: "Has completed tasks 10 days in a row!", time: "2 hrs. ago", img: require("@/assets/images/default-avatar.png"), },
    { id: 2, name: "nickfan", message: "Has logged in 20 days in a row!", time: "just now", img: require("@/assets/images/default-avatar.png"), },
    { id: 3, name: "yunis", message: "Finished the group project!", time: "4 hrs. ago", img: require("@/assets/images/default-avatar.png"), },
    { id: 4, name: "samantha_k", message: "Reached a new productivity score of 85!", time: "Yesterday", img: require("@/assets/images/default-avatar.png"), },
    { id: 5, name: "david_a", message: "Completed a focus session of 60 minutes!", time: "1 day ago", img: require("@/assets/images/default-avatar.png"), },
    { id: 6, name: "emily_c", message: "Set a new goal for fitness tracking.", time: "2 days ago", img: require("@/assets/images/default-avatar.png"), },
];

// --- CircularProgress Component (Updated to accept dynamic color) ---
const CircularProgress = ({ percent, theme, colorKey }) => {
    const size = 80;
    const strokeWidth = 8;
    // Use the theme property for the circle color (e.g., theme.background, theme.primary, etc.)
    const activeColor = theme[colorKey] || theme.background;

    // The inner ring and text will use the active color
    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View style={[styles.circularProgressRing, { borderColor: theme.border }]} />
            <View style={[styles.circularProgressRingInner, { borderColor: activeColor, transform: [{ rotateZ: '-90deg' }] }]} />
            <Text style={[styles.progressText, { color: activeColor }]}>{percent}%</Text>
        </View>
    );
};

// --- Dashboard Card Component (New component for carousel item) ---
const DashboardCard = ({ item, theme }) => {
    // Determine text based on the card data
    const tasksText = `${item.tasksDone}/${item.tasksTotal} Tasks`;
    const progressText = item.tasksTotal === 100 ? `${item.label}` : 'Done';

    return (
        <View style={[styles.dashboardCard, { backgroundColor: theme.border }]}>
            <View style={styles.dashboardText}>
                <Text style={[styles.dashboardProgressText, { color: theme.background, fontSize: 16, fontWeight: 'bold' }]}>{item.label}</Text>
                <Text style={[styles.dashboardProgressText, { color: theme.background, marginTop: 5 }]}>{tasksText}</Text>
                <Text style={[styles.dashboardProgressText, { color: theme.background }]}>{progressText}</Text>
            </View>
            <CircularProgress percent={item.percent} theme={theme} colorKey={item.colorKey} />
        </View>
    );
};

export default function Home() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const containerBackgroundColor = theme.background;
    const router = useRouter();

    const [likedActivities, setLikedActivities] = useState({});
    const [activeIndex, setActiveIndex] = useState(0); // State to track visible carousel card

    const handleToggleLike = (id) => {
        setLikedActivities(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    // Handler to update the active index when the carousel scrolls
    const handleScroll = (event) => {
        const xOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(xOffset / (width * 0.9 + 20)); // Card width + margin
        setActiveIndex(index);
    };

    return (
        <View style={[styles.container, { backgroundColor: containerBackgroundColor }]}>

            {/* Header Bar */}
            <HeaderBar
                title="Home"
                showTitle={false}
                onNotificationPress={() => { /* navigation.navigate('Notifications') */ }}
                onSettingsPress={() => { router.push("../settings") }}
            />

            {/* Content ScrollView (main vertical scroll) */}
            <ScrollView
                // Remove the inline style and put it back in contentContainerStyle for better practice
                contentContainerStyle={[styles.contentScrollView, { paddingBottom: 100 }]}
            >
                {/* Dashboard Section Title */}
                <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: width * 0.05 }]}>Dashboard</Text>

                {/* 1 & 2. Horizontal ScrollView for Carousel */}
                <ScrollView
                    horizontal
                    pagingEnabled // Snaps to card boundaries
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.carouselContainer}
                >
                    {dashboardItems.map((item, index) => (
                        <DashboardCard key={item.id} item={item} theme={theme} />
                    ))}
                </ScrollView>

                {/* 3. Dynamic Carousel Dots */}
                <View style={styles.swiperDotsContainer}>
                    {dashboardItems.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: index === activeIndex ? theme.text : theme.border,
                                    opacity: index === activeIndex ? 1 : 0.5,
                                }
                            ]}
                        />
                    ))}
                </View>

                {/* Friend Activity Section Title */}
                <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: width * 0.05 }]}>Friend Activity</Text>

                {/* Friend Activity Feed */}
                <View style={styles.friendActivityList}>
                    {friendActivities.map((activity) => (
                        <FriendActivityItem
                            key={activity.id}
                            activity={activity}
                            theme={theme}
                            isLiked={!!likedActivities[activity.id]}
                            onToggleLike={handleToggleLike}
                        />
                    ))}
                </View>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // --- Header Bar Styles ---
    headerBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: width * 0.05,
        paddingBottom: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
    },
    headerTitle: {
        fontSize: 1, // Hidden title
    },
    iconButton: {
        padding: 8,
    },

    // --- Content ScrollView (Main Vertical) ---
    contentScrollView: {
        // paddingHorizontal removed here, now only applied to sections that need it
        paddingBottom: 100, // Space for custom tab bar
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 20,
        marginBottom: 10,
    },

    // --- Carousel Styles ---
    carouselContainer: {
        paddingHorizontal: width * 0.05, // Apply the horizontal padding here
        paddingBottom: 10,
    },
    dashboardCard: {
        width: width * 0.9, // Card is 90% of screen width
        marginRight: 20, // Space between cards
        borderRadius: 15,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 150,
        position: 'relative',
        // Note: The last card will have extra margin, which is fine for a carousel
    },
    dashboardText: { alignItems: 'flex-start', flexShrink: 1, },
    dashboardProgressText: { fontSize: Math.min(30, width * 0.07), fontWeight: "300", lineHeight: 35, },
    circularProgressRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 8, position: 'absolute', opacity: 0.3, },
    circularProgressRingInner: { width: 80, height: 80, borderRadius: 40, borderWidth: 8, position: 'absolute', },
    progressText: { fontSize: 18, fontWeight: 'bold', },

    // --- Carousel Dots ---
    swiperDotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 5,
        marginBottom: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },

    // --- Friend Activity List & Card Styles ---
    friendActivityList: {
        paddingHorizontal: width * 0.05, // Apply horizontal padding to this section
        paddingBottom: 20,
    },
    friendCard: {
        width: "100%",
        borderRadius: 15,
        padding: 15,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
        minHeight: 80,
        position: 'relative',
    },
    friendAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#444',
    },
    friendTextContent: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 60,
    },
    friendName: {
        fontSize: 16,
        fontWeight: "bold",
        lineHeight: 20,
    },
    friendMessage: {
        fontSize: 14,
        fontWeight: 'normal',
        lineHeight: 20,
    },
    friendActions: {
        position: 'absolute',
        top: 15,
        right: 15,
        alignItems: 'flex-end',
    },
    heartButton: {
        padding: 5,
        marginBottom: 15,
    },
    friendTime: {
        fontSize: 12,
        fontWeight: '300',
        alignSelf: 'flex-end',
    },
});