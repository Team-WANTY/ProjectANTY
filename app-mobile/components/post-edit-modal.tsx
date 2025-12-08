import React, { useRef, useEffect } from "react";
import {
  Modal,
  Animated,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Theme = {
  text: string,
  background: string,
  primary: string,
  secondary: string,
  border: string,
  inputBackground: string,
  cardBackground: string,
  secondaryText: string,
  tint: string,
  icon: string,
  tabIconDefault: string,
  tabIconSelected: string,
  onPrimary: string,
  error: string,
  onError: string,
  shadow: string,
};

type Props = {
  visible: boolean;
  theme: Theme;
  text: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export const PostEditModal: React.FC<Props> = ({
  visible,
  theme,
  text,
  onChangeText,
  onClose,
  onSave,
  onDelete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = (cb?: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => cb && cb());
  };

  useEffect(() => {
    if (visible) {
      fadeIn();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  const handleClose = () => {
    fadeOut(onClose);
  };

  const canSave = text.trim().length > 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.inputBackground,
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Edit Post
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Edit your post..."
              placeholderTextColor={theme.secondaryText}
              value={text}
              onChangeText={onChangeText}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: canSave ? theme.border : theme.secondary,
                },
              ]}
              onPress={onSave}
              disabled={!canSave}
            >
              <Text
                style={[styles.saveButtonText, { color: theme.background }]}
              >
                Save Changes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                { borderColor: "#ff4d4f" },
              ]}
              onPress={onDelete}
            >
              <Text style={[styles.deleteText, { color: "#ff4d4f" }]}>
                Delete Post
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    maxHeight: 260,
    marginBottom: 12,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  footer: {
    marginTop: 4,
  },
  saveButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
