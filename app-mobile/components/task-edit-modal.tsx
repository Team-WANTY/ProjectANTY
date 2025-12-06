import React, { useEffect, useRef } from "react";
import {
  Modal,
  Animated,
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type EditingTask = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  repeatLabel: string;
  first_relevant_date: string; // MM/DD/YYYY
};

export type Theme = {
  background: string;
  border: string;
  primary: string;
  text: string;
  secondaryText: string;
  cardBackground: string;
  onPrimary?: string;
  error?: string;
  onError?: string;
  shadow?: string;
};

type EditTaskModalProps = {
  visible: boolean;
  theme: Theme;
  categoriesList: string[];

  editingTask: EditingTask | null;
  setEditingTask: React.Dispatch<React.SetStateAction<EditingTask | null>>;

  isRepeatOpen: boolean;
  setIsRepeatOpen: React.Dispatch<React.SetStateAction<boolean>>;

  dateError: string;
  setDateError: React.Dispatch<React.SetStateAction<string>>;

  loading: boolean;
  onSave: () => void;
  onRequestClose: () => void;
};

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  visible,
  theme,
  categoriesList,
  editingTask,
  setEditingTask,
  isRepeatOpen,
  setIsRepeatOpen,
  dateError,
  setDateError,
  loading,
  onSave,
  onRequestClose,
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
    if (visible) fadeIn();
    else fadeAnim.setValue(0);
  }, [visible, fadeAnim]);

  const handleClose = () => fadeOut(onRequestClose);

  if (!visible || !editingTask) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none">
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.border,
              shadowColor: theme.shadow,
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
            accessibilityLabel="Close edit task"
            onPress={handleClose}
            style={styles.modalCloseButton}
          >
            <Text style={[styles.modalCloseText, { color: theme.primary }]}>✕</Text>
          </Pressable>

          <Text style={[styles.modalTitle, { color: theme.background }]}>Edit Task</Text>

          {/* Task Name */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Task Name</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.background, borderColor: theme.background },
              ]}
              value={editingTask.title}
              onChangeText={(text) =>
                setEditingTask((prev) => (prev ? { ...prev, title: text } : prev))
              }
              placeholder="Enter task name"
              placeholderTextColor={theme.background + "80"}
            />
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.background, borderColor: theme.background },
              ]}
              value={editingTask.description}
              onChangeText={(text) =>
                setEditingTask((prev) => (prev ? { ...prev, description: text } : prev))
              }
              placeholder="What’s this task about?"
              placeholderTextColor={theme.background + "80"}
              multiline
            />
          </View>

          {/* Category */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categoriesList.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: editingTask.category === cat ? theme.primary : "transparent",
                      borderColor: theme.background,
                    },
                  ]}
                  onPress={() =>
                    setEditingTask((prev) =>
                      prev ? { ...prev, category: prev.category === cat ? "" : cat } : prev
                    )
                  }
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      {
                        color: editingTask.category === cat ? theme.onPrimary : theme.background,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Repeat */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Repeat</Text>
            <Pressable style={[styles.dropdown, { borderColor: theme.background }]} onPress={() => setIsRepeatOpen((prev) => !prev)}>
              <Text style={[styles.dropdownText, { color: theme.background }]}>{editingTask.repeatLabel || "None"}</Text>
              <Ionicons name="chevron-down" size={18} color={theme.background} />
            </Pressable>

            {isRepeatOpen && (
              <View style={[
                styles.dropdownMenu,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.background,
                },
              ]}>
                {["None", "Daily", "Weekly", "Monthly", "Yearly"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.dropdownItem}
                    onPress={() => {
                      const value = opt === "None" ? "" : opt;
                      setEditingTask((prev) => (prev ? { ...prev, repeatLabel: value } : prev));
                      setIsRepeatOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: theme.secondaryText }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Due Date */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Due Date (MM/DD/YYYY)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.background,
                  borderColor: dateError ? theme.error : theme.background,
                },
              ]}
              value={editingTask.first_relevant_date}
              onChangeText={(text) => {
                setEditingTask((prev) => (prev ? { ...prev, first_relevant_date: text } : prev));
                setDateError("");
              }}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={theme.background + "80"}
            />
            {!!dateError && <Text style={[styles.errorText, { color: theme.error }]}>{dateError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={onSave}
          >
            {loading ? <ActivityIndicator /> : <Text style={[styles.saveButtonText, { color: theme.onPrimary }]}>{"Save Changes"}</Text>}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

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
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 5,
  },
  categoryOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 16,
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
  errorText: {
    fontSize: 14,
    marginTop: 5,
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
});
