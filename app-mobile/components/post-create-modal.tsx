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
  background: string;
  border: string;
  primary: string;
  text: string;
  secondaryText: string;
  cardBackground: string;
  onPrimary: string;
};

type Props = {
  visible: boolean;
  theme: Theme;
  text: string;
  commentsEnabled: boolean;
  onChangeText: (text: string) => void;
  onToggleComments: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export const PostCreateModal: React.FC<Props> = ({
  visible,
  theme,
  text,
  commentsEnabled,
  onChangeText,
  onToggleComments,
  onClose,
  onSubmit,
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

  const canSubmit = text.trim().length > 0;

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
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.cardBackground,
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
              Create Post
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
              placeholder="What's on your mind?"
              placeholderTextColor={theme.secondaryText}
              value={text}
              onChangeText={onChangeText}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>
                Allow comments
              </Text>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  {
                    borderColor: theme.border,
                    backgroundColor: commentsEnabled
                      ? theme.primary
                      : "transparent",
                  },
                ]}
                onPress={onToggleComments}
              >
                <Animated.View
                  style={[
                    styles.toggleCircle,
                    {
                      backgroundColor: commentsEnabled
                        ? theme.onPrimary
                        : theme.border,
                      alignSelf: commentsEnabled ? "flex-end" : "flex-start",
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: canSubmit ? theme.primary : theme.border,
              },
            ]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Text style={[styles.saveButtonText, { color: theme.background }]}>
              Post
            </Text>
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  saveButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
