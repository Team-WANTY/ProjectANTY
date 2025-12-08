// components/task-create-modal.tsx
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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type NewTask = {
  title: string;
  description: string;
  category: string;
  repeatLabel: string;
  first_relevant_date: string; // MM/DD/YYYY
  untilDate: string;
  repeatEnabled: boolean;
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
  repeatEndMode: "Forever" | "Until";
  setRepeatEndMode: React.Dispatch<React.SetStateAction<"Forever" | "Until">>;
  repeatEndDate: string;
  setRepeatEndDate: React.Dispatch<React.SetStateAction<string>>;
  repeatEndError: string;
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
  repeatEndMode,
  setRepeatEndMode,
  repeatEndDate,
  setRepeatEndDate,
  repeatEndError,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const fadeOut = (cb?: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => cb && cb());
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  const handleClose = () => fadeOut(onClose);

  return (
    <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none">
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
          <Pressable accessible accessibilityLabel="Close new task" onPress={handleClose} style={styles.modalCloseButton}>
            <Text style={[styles.modalCloseText, { color: theme.primary }]}>✕</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.background }]}> New Task </Text>

          {/* Task Name */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}> Task Name </Text>
            <TextInput
              style={[styles.input, { color: theme.background, borderColor: taskNameError ? "#ff4d4f" : theme.background }]}
              value={newTask.title}
              onChangeText={(text) => setNewTask((prev) => ({ ...prev, title: text }))}
              placeholder="Enter task name"
              placeholderTextColor={theme.background + "80"}
            />
            {!!taskNameError && <Text style={styles.errorText}>{taskNameError}</Text>}
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>Description</Text>
            <TextInput
              style={[styles.input, { color: theme.background, borderColor: theme.background }]}
              value={newTask.description}
              onChangeText={(text) => setNewTask((prev) => ({ ...prev, description: text }))}
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
                      backgroundColor: newTask.category === cat ? theme.primary : "transparent",
                      borderColor: theme.background,
                    },
                  ]}
                  onPress={() =>setNewTask((prev) => ({...prev, category: prev.category === cat ? "" : cat}))}
                >
                  <Text style={[styles.categoryOptionText, { color: newTask.category === cat ? "#fff" : theme.background }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Repeat (Simple -> Advanced) */}
          <View style={styles.inputContainer}>
            {/* Row: label + toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.inputLabel, { color: theme.background }]}>Repeat</Text>
              <Switch
                value={newTask.repeatEnabled}
                onValueChange={(value) => {
                  setNewTask((prev) => ({
                    ...prev,
                    repeatEnabled: value,
                    repeatLabel: value ? (prev.repeatLabel || "Daily") : "",
                    untilDate: value ? prev.untilDate : "",
                  }));
                  setIsRepeatOpen(false);
                  if (!value) {
                    setRepeatEndMode("Forever");
                    setRepeatEndDate("");
                  }
                }}
                trackColor={{ false: "#b0b0b0", true: theme.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Advanced options only when Repeat = Yes */}
            {newTask.repeatEnabled && (
              <>
                {/* Frequency: Daily/Weekly/Monthly/Yearly */}
                <Pressable
                  style={[styles.dropdown, { borderColor: theme.background, marginTop: 8 }]}
                  onPress={() => setIsRepeatOpen((prev) => !prev)}
                >
                  <Text style={[styles.dropdownText, { color: theme.background }]}>
                    {newTask.repeatLabel || "Daily"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.background} />
                </Pressable>

                {isRepeatOpen && (
                  <View style={[styles.dropdownMenu, { backgroundColor: theme.cardBackground, borderColor: theme.background }]}>
                    {["Daily", "Weekly", "Monthly", "Yearly"].map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setNewTask((prev) => ({ ...prev, repeatLabel: opt }));
                          setIsRepeatOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText,{ color: theme.secondaryText }]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Duration (Forever / Until)*/}
                <View style={[styles.inputContainer, { marginTop: 10 }]}>
                  <Text style={[styles.inputLabel, { color: theme.background }]}>Duration</Text>
                  <View style={{ flexDirection: "row", marginBottom: 8 }}>
                    <TouchableOpacity
                      style={[styles.categoryOption, repeatEndMode === "Forever" && { backgroundColor: theme.primary }]}
                      onPress={() => {
                        setRepeatEndMode("Forever");
                        setNewTask((p) => ({ ...p, untilDate: "" }));
                      }}
                    >
                      <Text style={[styles.categoryOptionText, { color: repeatEndMode === "Forever" ? "#fff" : theme.background }]}>Forever</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.categoryOption,{ marginLeft: 8 }, repeatEndMode === "Until" && { backgroundColor: theme.primary }]}
                      onPress={() => setRepeatEndMode("Until")}
                    >
                      <Text style={[styles.categoryOptionText, { color: repeatEndMode === "Until" ? "#fff" : theme.background }]}>Until</Text>
                    </TouchableOpacity>
                  </View>

                  {repeatEndMode === "Until" && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.inputLabel, { color: theme.background }]}>Until Date</Text>
                      <TextInput
                        style={[styles.input, {color: theme.background, borderColor: repeatEndError ? "#ff4d4f" : theme.background}]}
                        value={repeatEndDate}
                        onChangeText={(text) => {
                          setRepeatEndDate(text);                        
                          setNewTask((p) => ({ ...p, untilDate: text }));
                        }}
                        placeholder="MM/DD/YYYY"
                        placeholderTextColor={theme.background + "80"}
                      />
                    </View>
                  )}
                  {!!repeatEndError && (
                    <Text style={styles.errorText}>{repeatEndError}</Text>
                  )}
                </View>
              </>
            )}
          </View>

          {/* First Relevant Date (acts as Due Date / Start Date in UI) */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.background }]}>
              {newTask.repeatEnabled ? "Start Date" : "Due Date"}
            </Text>
            <TextInput 
              style={[styles.input, {color: theme.background, borderColor: dateError ? "#ff4d4f" : theme.background}]}
              value={newTask.first_relevant_date}
              onChangeText={(text) => setNewTask((prev) => ({ ...prev, first_relevant_date: text }))}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={theme.background + "80"}
            />
            {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={onSubmit}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={[styles.saveButtonText, { color: "#fff" }]}>Add Task</Text>
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
    color: "#f5272aff",
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