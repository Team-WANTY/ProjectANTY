import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBar } from "@/components/header-bar";

import { usersApi } from "@/services/api/users-api";
import { profileApi } from "@/services/api/profiles-api";
import { imagesApi } from "@/services/api/image-api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const fontSize = 20; // base for back arrow sizing

// Simple placeholder analytics / badges for friend profile
const analyticsData = {
  tasksCompleted: 0,
  longestStreak: "-",
  badgesEarned: "0/0",
};

const badgeImages = {
  badge1: "../../assets/images/icon.png",
  badge2: "../../assets/images/icon.png",
  badge3: "../../assets/images/icon.png",
};

const badges = [
  { id: "b1", name: "BLAZING STREAK", image: badgeImages.badge1 },
  { id: "b2", name: "RISING FLAME", image: badgeImages.badge2 },
  { id: "b3", name: "TASK CHAMPION", image: badgeImages.badge3 },
];

type FriendProfileData = {
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export default function FriendProfileScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<FriendProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const [user, profile] = await Promise.all([
          usersApi.getPublicById(userId as string),
          profileApi.getById(userId as string),
        ]);

        let avatarUrl: string | null = null;

        if (profile.ok && profile.data?.avatar_image_id) {
          const img = await imagesApi.getUrl(profile.data.avatar_image_id);
          avatarUrl = img.ok ? img.data : null;
        }

        if (!cancelled && user.ok && profile.ok) {
          setData({
            username: user.data.username ?? null,
            bio: profile.data.bio ?? null,
            avatarUrl,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setData({
            username: null,
            bio: null,
            avatarUrl: null,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!data || !data.username) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: theme.text, fontSize: 16 }}>
          Unable to load profile.
        </Text>
      </View>
    );
  }

  const headerLightColor = theme.border;
  const backgroundPrimary = theme.background;
  const textLightOnDark = theme.text;

  return (
    <View style={{ flex: 1, backgroundColor: backgroundPrimary }}>
      <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
        
        {/* --- HEADER SECTION (identical structure to profile.tsx) --- */}
        <View style={[styles.headerSection, { height: HEADER_BACKGROUND_HEIGHT }]}>
          
          {/* Header Bar with Back Arrow */}
          <HeaderBar
            showBack
            showTitle={false}
            onBackPress={() => router.back()}
          />

          {/* Profile Row (avatar + username + friends link) */}
          <View style={styles.profileRow}>
            
            {/* Swoosh background */}
            <View style={styles.swooshContainer}>
              <DecorativeSwoosh
                color={headerLightColor}
                width={screenWidth}
                height={HEADER_BACKGROUND_HEIGHT * 1.1}
              />
            </View>

            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {data.avatarUrl ? (
                <Image source={{ uri: data.avatarUrl }} style={styles.profileImage} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Text style={styles.avatarInitial}>
                    {data.username?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}
            </View>

            {/* Username + stats */}
            <View style={styles.userInfo}>
              <Text style={styles.displayUsername}>{data.username}</Text>

              <View style={styles.socialStats}>
                <TouchableOpacity onPress={() => router.push("/friends")}>
                  <Text style={styles.socialText}>
                    - <Text style={styles.friendsLink}>Friends</Text>
                  </Text>
                </TouchableOpacity>

                <Text style={styles.socialText}>0 Likes</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- SCROLLABLE CONTENT (Bio, Analytics, Badges) --- */}
        <ScrollView contentContainerStyle={styles.scrollContentContainer}>
          
          {/* Bio Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>
              Bio
            </Text>
            <View
              style={[
                styles.bioInputFrame,
                {
                  backgroundColor: headerLightColor,
                  borderColor: headerLightColor,
                },
              ]}
            >
              <Text style={[styles.bioTextInput, { color: backgroundPrimary }]}>
                {data.bio}
              </Text>
            </View>
          </View>

          {/* Analytics Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>
              Analytics
            </Text>
            <View
              style={[
                styles.analyticsCard,
                {
                  backgroundColor: headerLightColor,
                  borderColor: headerLightColor,
                },
              ]}
            >
              <View style={styles.analyticItem}>
                <Text style={[styles.analyticValue, { color: textLightOnDark }]}>
                  {analyticsData.tasksCompleted}
                </Text>
                <Text style={[styles.analyticLabel, { color: textLightOnDark }]}>
                  Tasks completed
                </Text>
              </View>

              <View style={styles.analyticItem}>
                <Text style={[styles.analyticValue, { color: textLightOnDark }]}>
                  {analyticsData.longestStreak}
                </Text>
                <Text style={[styles.analyticLabel, { color: textLightOnDark }]}>
                  Longest task streak
                </Text>
              </View>

              <View style={styles.analyticItem}>
                <Text style={[styles.analyticValue, { color: textLightOnDark }]}>
                  {analyticsData.badgesEarned}
                </Text>
                <Text style={[styles.analyticLabel, { color: textLightOnDark }]}>
                  Badges earned
                </Text>
              </View>
            </View>
          </View>

          {/* Badges Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textLightOnDark }]}>
              Badges
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesContainer}
            >
              {badges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <Image source={{ uri: badge.image }} style={styles.badgeImage} />
                  <Text style={[styles.badgeText, { color: backgroundPrimary }]}>
                    {badge.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ---------- STYLES (mirrors profile.tsx layout) ----------

const SWOOSH_FACTOR = 0.55;
const PADDING_HORIZONTAL = screenWidth * 0.05;
const HEADER_BACKGROUND_HEIGHT = screenWidth * SWOOSH_FACTOR;
const IMAGE_SIZE = screenWidth * 0.25;

function getStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    headerSection: {
      width: "100%",
      height: HEADER_BACKGROUND_HEIGHT * 1.1,
      marginBottom: HEADER_BACKGROUND_HEIGHT * 0.3,
    },
    swooshContainer: {
      position: "absolute",
      top: -(HEADER_BACKGROUND_HEIGHT * 0.15),
      left: 0,
      width: screenWidth,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: PADDING_HORIZONTAL,
      paddingTop: screenHeight * 0.01,
      // marginTop: HEADER_BACKGROUND_HEIGHT * 0.3,
    },
    profileImage: {
      width: "100%",
      height: "100%",
      borderRadius: IMAGE_SIZE / 2,
    },
    userInfo: { flex: 1 },
    displayUsername: {
      fontSize: screenWidth * 0.045,
      fontWeight: "bold",
      marginBottom: screenHeight * 0.005,
      color: theme.background,
    },
    socialStats: {
      flexDirection: "row",
      gap: screenWidth * 0.02,
      color: theme.secondaryText,
    },
    socialText: {
      fontSize: screenWidth * 0.03,
      color: theme.secondaryText,
    },
    scrollContentContainer: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    bioInputFrame: {
      padding: 10,
      borderRadius: 5,
      minHeight: 80,
      borderWidth: 1,
    },
    bioTextInput: {
      fontSize: 14,
      minHeight: 60,
      textAlignVertical: "top",
    },
    analyticsCard: {
      borderRadius: 5,
      padding: 15,
      gap: 10,
      borderWidth: 1,
    },
    analyticItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    analyticValue: { fontSize: 18, fontWeight: "bold", minWidth: 40 },
    analyticLabel: { fontSize: 14, fontWeight: "500" },
    badgesContainer: { paddingVertical: 5, gap: 10 },
    badgeItem: { alignItems: "center", width: 70 },
    badgeImage: {
      width: 50,
      height: 60,
      borderRadius: 5,
      marginBottom: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 1.84,
      elevation: 2,
    },
    badgeText: {
      fontSize: 8,
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 10,
    },
    friendsLink: {
      textDecorationLine: "underline",
    },
    avatarWrapper: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      borderRadius: IMAGE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: PADDING_HORIZONTAL * 0.5,
      position: "relative",
    },
    avatarFallback: {
      width: "100%",
      height: "100%",
      borderRadius: IMAGE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: 46,
      fontWeight: "700",
      color: "white",
    },
    backButton: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
    },
  });
}
