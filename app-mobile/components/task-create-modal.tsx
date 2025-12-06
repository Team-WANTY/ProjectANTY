// components/task-create-modals.tsx
import React, { useRef, useEffect } from "react";
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

export type NewTask = {
  title: string;
  description: string;
  category: string;
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
};

type NewTaskModalProps = {
  visible: boolean;
  theme: Theme;
  categoriesList: string[];
  newTask: NewTask;
  setNewTask: React.Dispatch<React.SetStateAction<NewTask>>;
  isRepeatOpen: boolean;
  setIsRepeatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dateError: string;
  taskNameError: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  visible,
  theme,
  categoriesList,
  newTask,
  setNewTask,
  isRepeatOpen,
  setIsRepeatOpen,
  dateError,
  taskNameError,
  loading,
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
      // open → fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // closed → reset
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  const handleClose = () => {
    fadeOut(onClose);
  };

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
            accessibilityLabel="Close new task"
            onPress={handleClose}
            style={styles.modalCloseButton}
          >
            <Text style={[styles.modalCloseText, { color: theme.primary }]}>✕</Text>
          </Pressable>

          <Text style={[styles.modalTitle, { color: theme.background }]}>
            New Task
          </Text>

          {/* Task Name */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>
              Task Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.background,
                  borderColor: taskNameError ? "#ff4d4f" : theme.background,
                },
              ]}
              value={newTask.title}
              onChangeText={(text) => {
                // clear error in parent if you want
                setNewTask((prev) => ({ ...prev, title: text }));
              }}
              placeholder="Enter task name"
              placeholderTextColor={theme.background + "80"}
            />
            {!!taskNameError && (
              <Text style={styles.errorText}>{taskNameError}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.background, borderColor: theme.background },
              ]}
              value={newTask.description}
              onChangeText={(text) =>
                setNewTask((prev) => ({ ...prev, description: text }))
              }
              placeholder="What’s this task about?"
              placeholderTextColor={theme.background + "80"}
              multiline
            />
          </View>

          {/* Category */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categoriesList.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor:
                        newTask.category === cat ? theme.primary : "transparent",
                      borderColor: theme.background,
                    },
                  ]}
                  onPress={() =>
                    setNewTask((prev) =>
                      prev
                        ? { ...prev, category: prev.category === cat ? "" : cat }
                        : prev
                    )
                  }
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      {
                        color:
                          newTask.category === cat
                            ? "#fff"
                            : theme.background,
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
            <Text style={[styles.inputLabel, { color: theme.background }]}>
              Repeat
            </Text>
            <Pressable
              style={[styles.dropdown, { borderColor: theme.background }]}
              onPress={() => setIsRepeatOpen((prev) => !prev)}
            >
              <Text style={[styles.dropdownText, { color: theme.background }]}>
                {newTask.repeatLabel || "None"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={theme.background}
              />
            </Pressable>

            {isRepeatOpen && (
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.background,
                  },
                ]}
              >
                {["None", "Daily", "Weekly", "Monthly", "Yearly"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.dropdownItem}
                    onPress={() => {
                      const value = opt === "None" ? "" : opt;
                      setNewTask((prev) => ({ ...prev, repeatLabel: value }));
                      setIsRepeatOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: theme.secondaryText },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* First Relevant Date (acts as Due Date in UI) */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>
              Due Date (MM/DD/YYYY)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.background,
                  borderColor: dateError ? "#ff4d4f" : theme.background,
                },
              ]}
              value={newTask.first_relevant_date}
              onChangeText={(text) =>
                setNewTask((prev) => ({ ...prev, first_relevant_date: text }))
              }
              placeholder="MM/DD/YYYY"
              placeholderTextColor={theme.background + "80"}
            />
            {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: theme.primary },
              loading && { opacity: 0.6 },
            ]}
            disabled={loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={[styles.saveButtonText, { color: "#fff" }]}>
                Add Task
              </Text>
            )}
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
    color: "#ff4d4f",
    fontSize: 14,
    marginTop: 5,
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
