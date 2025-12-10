// components/CategoryCreateModal.tsx
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
  onClose: () => void;        // parent will call fadeOut + hide
  onSubmit: () => void;       // parent handles adding category + closing
};

export const CategoryCreateModal: React.FC<Props> = ({
  visible,
  fadeAnim,
  theme,
  value,
  onChangeValue,
  onClose,
  onSubmit,
}) => {
  const { themeName } = require("@/context/ThemeContext").useTheme();
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim, backgroundColor: theme.background + 'CC' }]}> 
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[styles.modalContent, {
            backgroundColor: theme.border,
            transform: [
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          }]}
        >
          <Pressable
            accessible
            accessibilityLabel="Close new category"
            onPress={onClose}
            style={styles.modalCloseButton}
          >
            <Text style={[styles.modalCloseText, { color: theme.background }]}>✕</Text>
          </Pressable>

          <Text style={[styles.modalTitle, { color: theme.background }]}> 
            New Category
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}> 
              Category Name
            </Text>
            <TextInput
              style={[styles.input, { color: theme.background, borderColor: theme.background }]}
              value={value}
              onChangeText={onChangeValue}
              placeholder="Enter category name"
              placeholderTextColor={theme.background + "80"}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={onSubmit}
          >
            <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>Add Category</Text>
          </TouchableOpacity>
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
    borderRadius: 16,
    padding: 16,
  },
  modalCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
