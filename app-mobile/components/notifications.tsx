import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, Pressable, Animated, Image } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import { FadeOut } from "react-native-reanimated";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

const { width } = Dimensions.get("window");

export interface NotificationItem {
  id: string;
  username: string;
  text: string;
  avatar: any;
}

interface NotificationsProps {
  visible: boolean;
  onClose: () => void;
}

const demoNotifications: NotificationItem[] = [
  { id: "1", username: "tinnguyen", text: "liked your post", avatar: require("@/assets/images/default-avatar.png") },
  { id: "2", username: "nickfan", text: "commented on your post", avatar: require("@/assets/images/default-avatar.png") },
  { id: "3", username: "yunisnabiyev", text: "sent you a friend request", avatar: require("@/assets/images/default-avatar.png") },
  { id: "4", username: "anitadmrc", text: "mentioned you in a comment", avatar: require("@/assets/images/default-avatar.png") },
];

export default function Notifications({ visible, onClose }: NotificationsProps) {
  const { theme, themeName } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>(demoNotifications);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, sheetAnim]);

  const handleArchiveAll = () => {
    setNotifications([]);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // NotificationItem component (swipe-to-delete)
  const NotificationItem = ({ item }: { item: NotificationItem }) => {
    const anim = useRef(new Animated.Value(1)).current;
    const [isVisible, setIsVisible] = useState(true);

    const handleDelete = () => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        setTimeout(() => handleDeleteNotification(item.id), 10);
      });
    };

    const renderRightActions = () => {
      const purple = '#6c63a2';
      const bgColor = themeName === 'lilac' ? purple : styles.rightAction.backgroundColor;
      return (
        <RectButton style={[styles.rightAction, { backgroundColor: bgColor }]} onPress={handleDelete}>
          <View style={styles.trashIconContainer}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </View>
        </RectButton>
      );
    };

    return (
      isVisible && (
        <Animated.View style={[{ width: "100%" }, { opacity: anim }]}>
          <ReanimatedSwipeable
            renderRightActions={renderRightActions}
            overshootRight={false}
            rightThreshold={40}
            friction={2}
          >
            <View style={[styles.notificationItem,
              themeName === 'lilac'
                ? { backgroundColor: '#d8d4f2', borderColor: '#d8d4f2' }
                : themeName === 'blue'
                  ? { backgroundColor: '#AECDD9', borderColor: '#AECDD9' }
                  : {}
            ]}>
              <Image source={item.avatar} style={styles.avatar} />
              <Text style={[styles.notificationText, { color: themeName === 'lilac' ? '#fff' : ((theme.background === '#151718') ? '#000' : theme.primary), textAlign: 'left' }]}> 
                <Text style={{ fontWeight: 'bold' }}>{item.username}</Text> {item.text}
              </Text>
            </View>
          </ReanimatedSwipeable>
        </Animated.View>
      )
    );
  };

  // Animated bottom sheet overlay
  if (!visible) return null;

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dim overlay */}
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      {/* Sliding bottom sheet */}
      <Animated.View
        style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY: sheetTranslateY }] }]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
          <TouchableOpacity style={styles.archiveBtn} onPress={handleArchiveAll}>
            <Ionicons name="archive-outline" size={22} color="#fff" />
            <Text style={styles.archiveText}>Archive All</Text>
          </TouchableOpacity>
        </View>
        {notifications.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.text }]}>No notifications</Text>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NotificationItem item={item} />}
            style={{ width: "100%" }}
            contentContainerStyle={{ paddingBottom: 12 }}
          />
        )}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    minHeight: 220,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  archiveBtnSwipe: {
    backgroundColor: "#4F8EF7",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    height: "90%",
  },
  archiveTextSwipe: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  archiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: 6,
    // backgroundColor: "#f5f5f5", // removed for transparent background
  },
  archiveText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 5,
    padding: 15,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  notificationText: {
    fontSize: 15,
    textAlign: 'left',
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    marginVertical: 30,
    color: "#888",
  },
  rightAction: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 50,
    padding: 15,
    backgroundColor: "#ff4d4f",
    borderRadius: 5,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  trashIconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#eee',
  },
});
