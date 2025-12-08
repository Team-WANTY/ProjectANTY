import React, { useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { HeaderBar } from "@/components/header-bar";
import { useTasksStore } from "@/services/stores/tasks-store";
import { Ionicons } from "@expo/vector-icons";
import { useFriendsStore } from "@/services/stores/friends-store";
import { usePostsStore } from "@/services/stores/posts-store";
import { useCreatorsStore } from "@/services/stores/creators-store";

const { width } = Dimensions.get("window");





// Local Date -> "YYYY-MM-DD" 
const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${y}-${pad(m)}-${pad(day)}`;
};

// --- CircularProgress Component (real progress ring) ---
type CircularProgressProps = {
    percent: number;      // 0–100
    theme: any;
    colorKey: string;     // e.g. "background"
};

const CircularProgress = ({ percent, theme, colorKey }: CircularProgressProps) => {
    const size = 80;
    const strokeWidth = 8;
    const radius = size / 2;
    const r = radius - strokeWidth / 2;

    const activeColor = theme[colorKey] || theme.background;
    const trackColor = theme.border;

    // Clamp percent between 0 and 100
    const clamped = Math.max(0, Math.min(100, percent));
    const progress = clamped / 100;

    const circumference = 2 * Math.PI * r;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
            <Svg width={size} height={size}>
                {/* Background ring */}
                <Circle
                    cx={radius}
                    cy={radius}
                    r={r}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress ring */}
                <Circle
                    cx={radius}
                    cy={radius}
                    r={r}
                    stroke={activeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    // Start at top (12 o’clock)
                    transform={`rotate(-90 ${radius} ${radius})`}
                />
            </Svg>
            <Text style={[styles.progressText, { color: activeColor }]}>
                {Math.round(clamped)}%
            </Text>
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
};
const DashboardCard = ({ item, theme }: DashboardCardProps) => {
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
    // TODO: Replace with real friend activity data from your backend or store
    const friendActivities: any[] = [];
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const containerBackgroundColor = theme.background;
    const router = useRouter();
    const tasks = useTasksStore((s) => s.tasks);
    const occurrencesByDate = useTasksStore((s) => s.occurrencesByDate);
    const completedByDate = useTasksStore((s) => s.completedByDate);

    const friends = useFriendsStore((s) => s.friends);
    const posts = usePostsStore((s) => s.posts);
    const creatorsById = useCreatorsStore((s) => s.byId);

    // Calculate today's completion rate based on occurrences (same logic as Tasks page)
    const today = new Date();
    const todayKey = toDateKey(today);

    const idsForToday = occurrencesByDate[todayKey] ?? [];
    const completedIdsForToday = new Set(completedByDate[todayKey] ?? []);

    const completedCount = idsForToday.filter((id) => completedIdsForToday.has(id)).length;
    const totalCount = idsForToday.length;
    const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    // Find the 5 most recent posts from friends
    const friendIds = React.useMemo(
        () => friends.map((f) => f.friendUserId),
        [friends]
    );

    const recentFriendPosts = React.useMemo(() => {
        if (!friendIds.length) return [];

        const friendSet = new Set(friendIds);

        return posts
            .filter((p) => friendSet.has(p.creator_id))
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 5)
            .map((p) => {
                const creator = creatorsById[p.creator_id];
                const username = creator?.username ?? "Friend";
                const avatarUrl = creator?.avatarUrl ?? null;

                return {
                    id: p.id,
                    username,
                    avatarUrl,
                    text: p.text,
                };
            });
    }, [posts, friendIds, creatorsById]);

    // Build quick lookup map: taskId -> task
    const taskById = React.useMemo(() => {
        const map = new Map<string, (typeof tasks)[number]>();
        for (const t of tasks) map.set(t.id, t);
        return map;
    }, [tasks]);

    // Look up 5 tasks 
    const todayTasksForActivity = React.useMemo(() => {
        const ids = idsForToday;
        const completedSet = completedIdsForToday;

        return ids
            .map((id) => {
            const t = taskById.get(id);
            if (!t) return null;
            return {
                id: t.id,
                name: t.name,
                completed: completedSet.has(t.id),
            };
        })  
        .filter((x): x is { id: string; name: string; completed: boolean } => !!x)
        .slice(0, 5);
    }, [idsForToday, completedIdsForToday, taskById]);


    return (
        <View style={[styles.container, { backgroundColor: containerBackgroundColor }]}>
            {/* Header Bar */}
            <HeaderBar
                title="Home"
                showTitle={false}
                onSettingsPress={() => { router.push("../settings") }}
            />
            {/* Content ScrollView (main vertical scroll) */}
            <ScrollView
                contentContainerStyle={[styles.contentScrollView, { paddingBottom: 100 }]}
            >
                {/* Dashboard Section Title */}
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
                    />
                </View>
                {/* Friend Activity Section Title */}
                <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: width * 0.05 }]}>Activity</Text>
                {/* Friend Activity Feed or Empty State */}
                <View style={styles.friendActivityList}>
                    {recentFriendPosts.length === 0 && todayTasksForActivity.length === 0 ? (
                        <View style={{alignItems: "center", justifyContent: "center", width: "100%", paddingVertical: 20}}>
                            <Text style={{color: theme.text, fontSize: 12, opacity: 0.6, textAlign: "center", fontWeight: "400"}}>No activity yet. Add friends and complete tasks to see activity here! </Text>
                        </View>
                    ) : (
                        <>
                            {/* Friend posts (up to 5) */}
                            {recentFriendPosts.map((p) => (
                                <View key={`post-${p.id}`} style={[styles.activityCard, { backgroundColor: theme.border }]}>
                                    <View style={styles.activityAvatarCircle}>
                                    {p.avatarUrl ? (
                                        <Image source={{ uri: p.avatarUrl }} style={styles.activityAvatarImage} />
                                    ) : (
                                        <Text style={styles.activityAvatarInitials}>
                                        {p.username.charAt(0).toUpperCase()}
                                        </Text>
                                    )}
                                    </View>

                                    <View style={styles.activityText}>
                                    <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                                        {p.username} Posted
                                    </Text>
                                    <Text style={[styles.activitySubtitle, { color: theme.secondaryText }]} numberOfLines={1}>
                                        {p.text}
                                    </Text>
                                    </View>
                                </View>
                            ))}


                            {/* Today's tasks (up to 5) */}
                            {todayTasksForActivity.map((t) => (
                                <View key={`task-${t.id}`} style={[styles.activityCard, { backgroundColor: theme.border }]}>
                                    <View style={{ marginRight: 10 }}>
                                        <Ionicons
                                            name={t.completed ? "checkmark-circle" : "ellipse-outline"}
                                            size={22}
                                            color={t.completed ? theme.primary : theme.secondaryText}
                                        />
                                    </View>

                                    <View style={styles.activityText}>
                                    <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                                        {t.name}
                                    </Text>
                                    <Text style={[styles.activitySubtitle, { color: theme.secondaryText }]} numberOfLines={1}>
                                        {t.completed ? "Completed today" : "Pending today"}
                                    </Text>
                                    </View>
                                </View>
                            ))}

                        </>
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
    activityRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    activityAvatarCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        backgroundColor: "#555",
        overflow: "hidden",
    },
    activityAvatarImage: {
        width: "100%",
        height: "100%",
    },
    activityAvatarInitials: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },
    activityIconBubble: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    activityText: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: "600",
    },
    activitySubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    activityCard: {
        width: "100%",
        borderRadius: 15,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },

});