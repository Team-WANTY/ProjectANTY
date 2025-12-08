// --- Mock Data for Friend Activity (Restored) ---
const friendActivities = [
    { id: 1, name: "tinnguyen", message: "Has completed tasks 10 days in a row!", time: "2 hrs. ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 2 },
    { id: 2, name: "nickfan", message: "Has logged in 20 days in a row!", time: "just now", img: require("@/assets/images/default-avatar.png"), commentsCount: 1 },
    { id: 3, name: "yunis", message: "Finished the group project!", time: "4 hrs. ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 0 },
    { id: 4, name: "samantha_k", message: "Reached a new productivity score of 85!", time: "Yesterday", img: require("@/assets/images/default-avatar.png"), commentsCount: 3 },
    { id: 5, name: "david_a", message: "Completed a focus session of 60 minutes!", time: "1 day ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 0 },
    { id: 6, name: "emily_c", message: "Set a new goal for fitness tracking.", time: "2 days ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 1 },
];
import React, { useState } from "react";
import { useTasksStore } from "@/services/stores/tasks-store";
import { View, Text, Image, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { HeaderBar } from "@/components/header-bar";
import FriendActivityItem from "@/components/friend-activity";

const { width } = Dimensions.get("window");

// --- CircularProgress Component (Updated to accept dynamic color) ---
type CircularProgressProps = {
    percent: number;
    theme: any;
    colorKey: string;
    textColor?: string;
};
const CircularProgress = ({ percent, theme, colorKey, textColor }: CircularProgressProps) => {
    const size = 80;
    const strokeWidth = 8;
    const purple = '#6c63a2';
    const isLilac = theme.themeName === 'lilac';
    const activeColor = isLilac ? purple : (theme[colorKey] || theme.onBackground);
    const percentColor = textColor ?? (isLilac ? purple : theme.onBackground);
    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View style={[styles.circularProgressRing, { borderColor: theme.border }]} />
            <View style={[styles.circularProgressRingInner, { borderColor: activeColor, transform: [{ rotateZ: '-90deg' }] }]} />
            <Text style={[styles.progressText, { color: percentColor }]}>{percent}%</Text>
        </View>
    );
};

// --- Dashboard Card Component (New component for carousel item) ---
type DashboardCardProps = {
    item: {
        label: string;
        tasksDone: number;
        tasksTotal: number;
        percent: number;
        colorKey: string;
    };
    theme: any;
    textColor?: string;
};
const DashboardCard = ({ item, theme }: DashboardCardProps) => {
    // Determine text based on the card data
    const tasksText = `${item.tasksDone}/${item.tasksTotal} Tasks`;
    const progressText = item.tasksTotal === 100 ? `${item.label}` : 'Done';
    const purple = '#6c63a2';
    const isDark = theme.themeName === 'dark';
    const computedTextColor = isDark ? '#000' : (theme.themeName === 'lilac' ? purple : theme.background);
    return (
        <View style={[styles.dashboardCard, { backgroundColor: theme.border }]}> 
            <View style={styles.dashboardText}> 
                <Text style={[styles.dashboardProgressText, { color: computedTextColor, fontSize: 16, fontWeight: 'bold' }]}>{item.label}</Text> 
                <Text style={[styles.dashboardProgressText, { color: computedTextColor, marginTop: 5 }]}>{tasksText}</Text> 
                <Text style={[styles.dashboardProgressText, { color: computedTextColor }]}>{progressText}</Text> 
            </View> 
            <CircularProgress percent={item.percent} theme={theme} colorKey={item.colorKey} textColor={computedTextColor} /> 
        </View> 
    );
};

export default function Home() {
    // MOCK DATA for theme testing
    const friendActivities = [
        { id: 1, name: "tinnguyen", message: "Has completed tasks 10 days in a row!", time: "2 hrs. ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 2 },
        { id: 2, name: "nickfan", message: "Has logged in 20 days in a row!", time: "just now", img: require("@/assets/images/default-avatar.png"), commentsCount: 1 },
        { id: 3, name: "yunis", message: "Finished the group project!", time: "4 hrs. ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 0 },
        { id: 4, name: "samantha_k", message: "Reached a new productivity score of 85!", time: "Yesterday", img: require("@/assets/images/default-avatar.png"), commentsCount: 3 },
        { id: 5, name: "david_a", message: "Completed a focus session of 60 minutes!", time: "1 day ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 0 },
        { id: 6, name: "emily_c", message: "Set a new goal for fitness tracking.", time: "2 days ago", img: require("@/assets/images/default-avatar.png"), commentsCount: 1 },
    ];
    const { theme, themeName } = useTheme();
    const percentTextColor = themeName === 'dark' ? '#000' : theme.onBackground;
    const insets = useSafeAreaInsets();
    const containerBackgroundColor = theme.background;
    const router = useRouter();
    const tasks = useTasksStore((s) => s.tasks);

    // Calculate today's completion rate
    const today = new Date();
    const todayTasks = tasks.filter((t) => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date * 1000);
        return (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
        );
    });
    const completedCount = todayTasks.filter((t) => t.completed).length;
    const totalCount = todayTasks.length;
    const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return (
        <View style={[styles.container, { backgroundColor: containerBackgroundColor }]}> 
            <HeaderBar
                title="Home"
                showTitle={true}
                onSettingsPress={() => { router.push("../settings") }}
            />
            <ScrollView
                contentContainerStyle={[styles.contentScrollView, { paddingBottom: 100 }]}
            >
                <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: width * 0.05 }]}>Dashboard</Text>
                {/* Only show today's completion rate card */}
                <View style={styles.carouselContainer}>
                    <DashboardCard
                        item={{
                            label: "Today's Completion Rate",
                            tasksDone: completedCount,
                            tasksTotal: totalCount,
                            percent,
                            colorKey: 'background',
                        }}
                        theme={theme}
                        textColor={percentTextColor}
                    />
                </View>
                {/* Friend Activity Section Title */}
                <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: width * 0.05 }]}>Friend Activity</Text>
                {/* Friend Activity Feed or Empty State */}
                <View style={styles.friendActivityList}>
                    {friendActivities.length === 0 ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 20 }}>
                            <Text style={{ color: theme.text, fontSize: 12, opacity: 0.6, textAlign: 'center', fontWeight: '400' }}>
                                There are no friends activity. Add friends to see what they've been up to!
                            </Text>
                        </View>
                    ) : (
                        friendActivities.map((activity: any) => (
                            <FriendActivityItem
                                key={activity.id}
                                activity={activity}
                                theme={theme}
                                themeName={themeName}
                                isLiked={false}
                                onToggleLike={() => { }}
                            />
                        ))
                    )}
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