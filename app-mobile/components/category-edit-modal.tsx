// components/category-edit-modal.tsx
import React from "react";
import {
  Modal,
  Animated,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Theme = {
  background: string;
  border: string;
  primary: string;
  text: string;
  secondaryText: string;
};

type Props = {
  visible: boolean;
  fadeAnim: Animated.Value;
  theme: Theme;
  value: string;
  onChangeValue: (text: string) => void;
  onClose: () => void;      // parent will do fadeOut + hide
  onSubmit: () => void;     // save / rename
  onDelete: () => void;     // delete category
};

export const CategoryEditModal: React.FC<Props> = ({
  visible,
  fadeAnim,
  theme,
  value,
  onChangeValue,
  onClose,
  onSubmit,
  onDelete,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.border,
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
          <Pressable
            accessible
            accessibilityLabel="Close edit category"
            onPress={onClose}
            style={styles.modalCloseButton}
          >
            <Text style={[styles.modalCloseText, { color: theme.background}]}>✕</Text>
          </Pressable>

          <Text style={[styles.modalTitle, { color: theme.background }]}>
            Edit Category
          </Text>

          <View style={[styles.inputContainer, { marginBottom: 16 }]}>
            <TextInput
              style={[
                styles.input,
                { color: theme.background, borderColor: theme.background },
              ]}
              value={value}
              onChangeText={onChangeValue}
              placeholder="Enter category name"
              placeholderTextColor={theme.background + "80"}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary, flex: 1 }]}
              onPress={onSubmit}
            >
              <Text style={[styles.saveButtonText, { color: theme.text }]}>
                Save Changes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: styles.errorText.color }]}
              onPress={onDelete}
            >
              <Ionicons name="trash" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    borderRadius: 15,
    padding: 20,
  },
  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 40,
  },
  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
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
  errorText: {
        color: "#ff4d4f",
    },
});
