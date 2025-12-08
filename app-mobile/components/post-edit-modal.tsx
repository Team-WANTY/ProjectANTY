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
  modalBorder: string;
  error: string;
  buttonText: string;
};

type Props = {
  visible: boolean;
  theme: Theme;
  themeName?: string;
  text: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export const PostEditModal: React.FC<Props> = ({
  visible,
  theme,
  themeName,
  text,
  onChangeText,
  onClose,
  onSave,
  onDelete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const darkBlue = '#1A2A3A';
  const lightBlue = '#AECDD9';
  const isBlueTheme = theme.cardBackground === lightBlue || themeName === 'blue';
  const canSave = text.trim().length > 0;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

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
              backgroundColor: theme.border,
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
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.background }]}>Edit Post</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.modalBorder} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.modalBorder,
                  backgroundColor: theme.border,
                  color: theme.background,
                },
              ]}
              placeholder="Edit your post..."
              placeholderTextColor={isBlueTheme ? '#F0F5F9' : theme.secondaryText}
              value={text}
              onChangeText={onChangeText}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: canSave ? theme.primary : theme.border, flex: 1, height: 50 },
                ]}
                onPress={onSave}
                disabled={!canSave}
              >
                <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: theme.error }]}
                onPress={onDelete}
              >
                <Ionicons name="trash" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
      saveButtonText: {
        fontSize: 16,
        fontWeight: "bold",
      },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      marginTop: 8,
    },
    deleteButton: {
      width: 50,
      height: 50,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
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
  // ...existing code...
  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
