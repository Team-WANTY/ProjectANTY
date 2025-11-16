import React, { useRef, useEffect, useState } from "react";
import {
  Modal,
  Animated,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

export type EditProfileModalProps = {
  visible: boolean;
  username: string | null;
  bio: string | null;
  saving: boolean;
  errorMsg: string | null;
  onClose: () => void;
  onSave: (username: string, bio: string) => void;
  onChangePhoto: () => void;
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  username,
  bio,
  saving,
  errorMsg,
  onClose,
  onSave,
  onChangePhoto,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [localUsername, setLocalUsername] = useState(username ?? "");
  const [localBio, setLocalBio] = useState(bio ?? "");

  useEffect(() => {
    if (visible) {
      setLocalUsername(username ?? "");
      setLocalBio(bio ?? "");
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, username, bio, fadeAnim]);

  const fadeOut = (cb?: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => cb && cb());
  };

  const handleClose = () => fadeOut(onClose);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={handleClose}
      animationType="none"
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>        
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

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
            accessibilityLabel="Close edit profile"
            onPress={handleClose}
            style={styles.modalCloseButton}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </Pressable>

          <Text style={[styles.modalTitle, { color: theme.background }]}>Edit Profile</Text>

          {/* Username */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Username</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.background, borderColor: theme.background },
              ]}
              value={localUsername}
              onChangeText={setLocalUsername}
              placeholder="Enter username"
              placeholderTextColor={theme.background + "80"}
              autoCapitalize="none"
            />
          </View>

          {/* Bio */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Bio</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.background,
                  borderColor: theme.background,
                  minHeight: 80,
                  textAlignVertical: "top",
                },
              ]}
              value={localBio}
              onChangeText={setLocalBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.background + "80"}
              multiline
            />
          </View>

          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <TouchableOpacity onPress={onChangePhoto} style={{ marginTop: 8 }}>
            <Text style={{ color: theme.background }}>Change Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }]}
            disabled={saving}
            onPress={() => onSave(localUsername.trim(), localBio.trim())}
          >
            <Text style={[styles.saveButtonText, { color: "#fff" }]}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default EditProfileModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 40,
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
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
    color: "#1D3B53",
  },
  errorText: {
    color: "#ff4d4f",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  }
});