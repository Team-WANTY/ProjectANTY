import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "@/context/ThemeContext";

const { width, height } = Dimensions.get("window");

interface NotificationsProps {
  onClose: () => void;
}

export default function Notifications({ onClose }: NotificationsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.overlay, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
      <Text style={[styles.text, { color: theme.text }]}>
        This is your notifications panel.
      </Text>
      <Text style={[styles.closeHint, { color: theme.text }]}>
        Tap the bell again to close.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  closeHint: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
