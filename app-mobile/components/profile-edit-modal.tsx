// EditProfileModal.tsx
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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export type EditProfileModalProps = {
  visible: boolean;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
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
  avatarUrl,
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
  }, [visible, username, bio]);

  const fadeOut = (cb?: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => cb && cb());
  };

  const handleClose = () => fadeOut(onClose);

  return (
    <Modal transparent visible={visible} onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.modal,
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
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={[styles.closeText, { color: (theme.background === '#151718') ? '#000' : theme.primary }]}>✕</Text>
          </Pressable>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Text style={styles.avatarInitial}>
                    {localUsername?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.avatarEditButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={onChangePhoto}
              >
                <Ionicons name="pencil" size={20} color={theme.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.title, { color: theme.background }]}>
            Edit Profile
          </Text>

          {/* Username */}
          <View style={styles.inputBlock}>
            <Text style={[styles.label, { color: theme.background }]}>
              Username
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.background,
                  borderColor: theme.background,
                },
              ]}
              value={localUsername}
              onChangeText={setLocalUsername}
              placeholder="Enter username"
              placeholderTextColor={theme.background + "80"}
              autoCapitalize="none"
            />
          </View>

          {/* Bio */}
          <View style={styles.inputBlock}>
            <Text style={[styles.label, { color: theme.background }]}>
              Bio
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  minHeight: 80,
                  textAlignVertical: "top",
                  color: theme.background,
                  borderColor: theme.background,
                },
              ]}
              multiline
              value={localBio}
              onChangeText={setLocalBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.background + "80"}
            />
          </View>

          {/* Error */}
          {errorMsg && (
            <Text style={[styles.errorText, { color: theme.error }]}>{errorMsg}</Text>
          )}

          {/* Save */}
          <TouchableOpacity
            disabled={saving}
            onPress={() => onSave(localUsername.trim(), localBio.trim())}
            style={[
              styles.saveButton,
              { backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.saveText, { color: theme.onPrimary }]}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const AVATAR_SIZE = 110;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    borderRadius: 15,
    padding: 20,
    paddingTop: 30,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    fontWeight: "600",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 12,
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    fontSize: 46,
    fontWeight: "700",
    color: "white",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarEditButton: {
    position: "absolute",
    bottom: -2,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    zIndex: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },
  inputBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  errorText: {
    color: "#ff4d4f",
    textAlign: "center",
    marginTop: -8,
    marginBottom: 8,
  },
});

export default EditProfileModal;
