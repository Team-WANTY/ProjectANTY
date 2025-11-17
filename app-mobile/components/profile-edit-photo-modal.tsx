import React, { useRef, useEffect } from "react";
import {
  Modal,
  Animated,
  StyleSheet,
  View,
  Text,
  Pressable,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

export type EditPhotoModalProps = {
  visible: boolean;
  onClose: () => void;
  onChooseFromLibrary: () => void;
  onTakePhoto: () => void;
  onRemoveAvatar: () => void; // parent handles removing avatar
};

export const EditPhotoModal: React.FC<EditPhotoModalProps> = ({
  visible,
  onClose,
  onChooseFromLibrary,
  onTakePhoto,
  onRemoveAvatar,
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

  const sheetTranslateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Dim overlay */}
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim },
        ]}
      >
        {/* Tap outside to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* Sliding bottom sheet */}
        <Animated.View
          style={[
            styles.bottomSheetContainer,
            {
              backgroundColor: theme.inputBackground,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View
            style={[
              styles.bottomSheetHandle,
              { backgroundColor: "rgba(255,255,255,0.4)" },
            ]}
          />

          {/* Title */}
          <Text
            style={[
              styles.bottomSheetTitle,
              { color: theme.text },
            ]}
          >
            Avatar
          </Text>

          {/* "Choose from gallery" row */}
          <Pressable
            style={({ pressed }) => [
              styles.optionRow,
              styles.optionRowTop,
              {
                backgroundColor: pressed
                  ? theme.cardBackground
                  : theme.background,
                borderBottomColor: theme.border,
              },
            ]}
            onPress={() => fadeOut(onChooseFromLibrary)}
          >
            <Text
              style={[
                styles.optionText,
                { color: theme.text },
              ]}
            >
              Choose from gallery
            </Text>
          </Pressable>

          {/* "Take a photo" row */}
          <Pressable
            style={({ pressed }) => [
              styles.optionRow,
              {
                backgroundColor: pressed
                  ? theme.cardBackground
                  : theme.background,
                borderBottomColor: theme.border,
              },
            ]}
            onPress={() => fadeOut(onTakePhoto)}
          >
            <Text
              style={[
                styles.optionText,
                { color: theme.text },
              ]}
            >
              Take a photo
            </Text>
          </Pressable>

          {/* "Remove Avatar" row */}
          <Pressable
            style={({ pressed }) => [
              styles.optionRow,
              styles.optionRowBottom,
              {
                backgroundColor: pressed
                  ? theme.cardBackground
                  : theme.background,
                borderBottomColor: theme.border,
              },
            ]}
            onPress={() => fadeOut(onRemoveAvatar)}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color: "#d00",
                  fontWeight: "600",
                },
              ]}
            >
              Remove Avatar
            </Text>
          </Pressable>

          
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
    paddingBottom: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomSheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionRowTop: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  optionRowBottom: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
  },
});
