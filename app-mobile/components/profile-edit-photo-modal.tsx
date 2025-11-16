import React, { useRef, useEffect } from "react";
import {
  Modal,
  Animated,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

export type EditPhotoModalProps = {
  visible: boolean;
  onClose: () => void;
  onChooseFromLibrary: () => void;
  onTakePhoto: () => void;
};

export const EditPhotoModal: React.FC<EditPhotoModalProps> = ({
  visible,
  onClose,
  onChooseFromLibrary,
  onTakePhoto,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Overlay with fade */}
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Backdrop press to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* Bottom sheet container */}
        <Animated.View
          style={[
            styles.bottomSheetContainer,
            {
              backgroundColor: theme.border,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.bottomSheetHandle} />

          <Text
            style={[
              styles.bottomSheetTitle,
              { color: theme.background },
            ]}
          >
            Change profile photo
          </Text>

          <TouchableOpacity
            style={styles.bottomSheetButton}
            onPress={() => {
              fadeOut(onChooseFromLibrary);
            }}
          >
            <Text
              style={[
                styles.bottomSheetButtonText,
                { color: theme.background },
              ]}
            >
              Choose from gallery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomSheetButton}
            onPress={() => {
              fadeOut(onTakePhoto);
            }}
          >
            <Text
              style={[
                styles.bottomSheetButtonText,
                { color: theme.background },
              ]}
            >
              Take a photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomSheetButton, styles.bottomSheetCancel]}
            onPress={handleClose}
          >
            <Text style={styles.bottomSheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default EditPhotoModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomSheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "left",
  },
  bottomSheetButton: {
    paddingVertical: 12,
  },
  bottomSheetButtonText: {
    fontSize: 16,
  },
  bottomSheetCancel: {
    marginTop: 8,
  },
  bottomSheetCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#d00",
  },
});
