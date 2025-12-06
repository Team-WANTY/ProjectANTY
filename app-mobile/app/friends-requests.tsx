import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated as RNAnimated,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DecorativeSwoosh from "@/components/decorative-swoosh";
import { useTheme } from "@/context/ThemeContext";
import Animated, {
  LinearTransition,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { friendsApi } from "@/services/api/friends-api";

const { width: screenWidth } = Dimensions.get("window");

/**
 * For now, a request is represented only by its ID (friendship/request id).
 * The backend `/friends/incoming` and `/friends/outgoing` endpoints return
 * `[string[], string | null]` => we wrap those ids into this shape.
 */
type DisplayRequest = {
  id: string;
};

type FriendRequestItemProps = {
  request: DisplayRequest;
  mode: "incoming" | "outgoing";
  theme: any;
  onAccept?: (req: DisplayRequest) => void;
  onDecline?: (req: DisplayRequest) => void;
  onCancel?: (req: DisplayRequest) => void;
};

function FriendRequestItemWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      layout={LinearTransition.springify().duration(1000)}
      style={{ width: "100%" }}
    >
      {children}
    </Animated.View>
  );
}

const FriendRequestItem: React.FC<FriendRequestItemProps> = ({
  request,
  mode,
  theme,
  onAccept,
  onDecline,
  onCancel,
}) => {
  // We no longer have username/avatar from backend; use placeholders.
  const label =
    mode === "incoming" ? "Incoming friend request" : "Outgoing friend request";
  const initial = request.id[0]?.toUpperCase() ?? "?";

  const anim = useRef(new RNAnimated.Value(1)).current;
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const baseAnimatedStyle = {
    opacity: anim,
    overflow: "hidden" as const,
  };

  const animatedSizeStyle =
    measuredHeight == null
      ? { marginBottom: 10 }
      : {
          height: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, measuredHeight],
          }),
          marginBottom: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 10],
          }),
        };

  const runCloseAnimation = (cb?: () => void) => {
    RNAnimated.timing(anim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: false, // needed for height/margin
    }).start(() => cb && cb());
  };

  const handleAccept = () => {
    runCloseAnimation(() => onAccept?.(request));
  };

  const handleDecline = () => {
    runCloseAnimation(() => onDecline?.(request));
  };

  const handleCancel = () => {
    runCloseAnimation(() => onCancel?.(request));
  };

  return (
    <RNAnimated.View
      style={[baseAnimatedStyle, animatedSizeStyle]}
      onLayout={(e) => {
        if (measuredHeight == null) {
          setMeasuredHeight(e.nativeEvent.layout.height);
        }
      }}
    >
      <View
        style={[
          styles.friendCard,
          {
            backgroundColor: theme.cardBackground,
          },
        ]}
      >
        <View style={styles.friendBanner}>
          {/* Avatar (placeholder for now) */}
          <View style={styles.friendAvatarWrapper}>
            <View
              style={[
                styles.friendImage,
                {
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Text style={styles.friendInitial}>{initial}</Text>
            </View>
          </View>

          {/* Label */}
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: theme.text }]}>
              {label}
            </Text>
          </View>
        </View>

        {/* Right-side action buttons */}
        {mode === "incoming" ? (
          <View style={styles.actionsRow}>
            {/* Accept */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.acceptButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleAccept}
            >
              <Ionicons name="checkmark-sharp" size={18} color={theme.text} />
            </TouchableOpacity>

            {/* Decline */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.declineButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleDecline}
            >
              <Ionicons name="close-sharp" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            {/* Cancel (outgoing) */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.declineButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleCancel}
            >
              <Ionicons name="close-sharp" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </RNAnimated.View>
  );
};

const FriendRequestsScreen: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [incoming, setIncoming] = useState<DisplayRequest[]>([]);
  const [outgoing, setOutgoing] = useState<DisplayRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const SWOOSH_COMPONENT_HEIGHT = screenWidth * 0.495;
  const headerTextColor = theme.background;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorText(null);

      try {
        // New API: both return IdPage { ids: string[], continuationToken }
        const [incomingRes, outgoingRes] = await Promise.all([
          friendsApi.listIncoming(20),
          friendsApi.listOutgoing(20),
        ]);

        if (!incomingRes.ok && !outgoingRes.ok) {
          setErrorText(
            incomingRes.message ||
              outgoingRes.message ||
              "Failed to load friend requests"
          );
          return;
        }

        const incomingIds =
          incomingRes.ok && incomingRes.data ? incomingRes.data.ids : [];
        const outgoingIds =
          outgoingRes.ok && outgoingRes.data ? outgoingRes.data.ids : [];

        if (!cancelled) {
          setIncoming(incomingIds.map((id) => ({ id })));
          setOutgoing(outgoingIds.map((id) => ({ id })));
        }
      } catch (e) {
        if (!cancelled) {
          setErrorText("Failed to load friend requests");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAccept = async (req: DisplayRequest) => {
    console.log("[FriendRequests] Accept:", req.id);
    const res = await friendsApi.accept(req.id);

    if (!res.ok) {
      console.log("Error accepting friend request:", res.message);
      setErrorText(res.message || "Failed to accept friend request");
      return;
    }

    // Just remove from incoming; friends list will be refreshed elsewhere.
    setIncoming((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleDecline = async (req: DisplayRequest) => {
    console.log("[FriendRequests] Decline:", req.id);
    const res = await friendsApi.decline(req.id);

    if (!res.ok) {
      console.log("Error declining friend request:", res.message);
      setErrorText(res.message || "Failed to decline friend request");
      return;
    }

    setIncoming((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleCancel = async (req: DisplayRequest) => {
    console.log("[FriendRequests] Cancel:", req.id);
    const res = await friendsApi.cancel(req.id);

    if (!res.ok) {
      console.log("Error canceling friend request:", res.message);
      setErrorText(res.message || "Failed to cancel friend request");
      return;
    }

    setOutgoing((prev) => prev.filter((r) => r.id !== req.id));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Swoosh */}
      <View style={{ height: SWOOSH_COMPONENT_HEIGHT }}>
        <DecorativeSwoosh
          color={theme.border}
          width={screenWidth}
          height={SWOOSH_COMPONENT_HEIGHT}
        />

        <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top }]}>
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 15 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={headerTextColor} />
          </TouchableOpacity>

          {/* Title */}
          <Text
            style={[
              styles.headerTitle,
              {
                color: headerTextColor,
                top: insets.top + 50,
                width: screenWidth,
                textAlign: "center",
              },
            ]}
          >
            Friend Requests
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {errorText ? (
            <Text
              style={[
                styles.errorText,
                {
                  color: theme.secondaryText,
                },
              ]}
            >
              {errorText}
            </Text>
          ) : null}

          {/* Incoming Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Incoming
          </Text>
          {incoming.length === 0 ? (
            <Text
              style={[
                styles.emptySectionText,
                { color: theme.secondaryText },
              ]}
            >
              No incoming requests
            </Text>
          ) : (
            incoming.map((req) => (
              <FriendRequestItemWrapper key={req.id}>
                <FriendRequestItem
                  request={req}
                  mode="incoming"
                  theme={theme}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              </FriendRequestItemWrapper>
            ))
          )}

          {/* Thin separator line */}
          <View
            style={[
              styles.sectionDivider,
              { borderBottomColor: theme.border },
            ]}
          />

          {/* Outgoing Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Outgoing
          </Text>

          {outgoing.length === 0 ? (
            <Text
              style={[
                styles.emptySectionText,
                { color: theme.secondaryText },
              ]}
            >
              No outgoing requests
            </Text>
          ) : (
            outgoing.map((req) => (
              <FriendRequestItemWrapper key={req.id}>
                <FriendRequestItem
                  request={req}
                  mode="outgoing"
                  theme={theme}
                  onCancel={handleCancel}
                />
              </FriendRequestItemWrapper>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default FriendRequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  headerTitle: {
    position: "absolute",
    fontSize: 28,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
  },
  sectionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  emptySectionText: {
    fontSize: 14,
    marginBottom: 8,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  friendBanner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendAvatarWrapper: {
    marginRight: 12,
  },
  friendImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  friendInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  acceptButton: {},
  declineButton: {},
  loadingContainer: {
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
  },
});
