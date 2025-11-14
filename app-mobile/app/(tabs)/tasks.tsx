import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, 
    Animated,Modal, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";

import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar";

import { tasksApi, type RepeatRule, type FrequencySpecifier } from "@/services/api/tasks-api";
import { useUserStore } from "@/services/stores/users-store";
import { useTasksStore } from "@/services/stores/tasks-store";
import { NewTaskModal  } from "@/components/task-create-modal";
import { EditTaskModal } from "@/components/task-edit-modal";

const { width } = Dimensions.get("window");


// MM/DD/YYYY -> valid?
const isValidDateFormat = (dateStr: string) => {
  const dateRegex =
    /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateRegex.test(dateStr)) return false;

  const [month, day, year] = dateStr.split("/").map(Number);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
};

// MM/DD/YYYY -> Unix timestamp (seconds)
const dateStringToUnix = (dateStr: string): number => {
  const [month, day, year] = dateStr.split("/").map(Number);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
};

// Unix timestamp (seconds) -> nice label
const unixToDisplayDate = (ts?: number | null): string => {
  if (!ts) return "No due date";
  const d = new Date(ts * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

// Helper to compare selected date to tasks' due_date
const unixToDate = (ts?: number | null): Date | null => {
  if (!ts) return null;
  return new Date(ts * 1000);
};

// Turn repeat rule from front end to match backend
const buildRepeatRuleFromLabel = (label: string): RepeatRule | null => {
  if (!label || label === "None") return null;

  const freqMap: Record<string, FrequencySpecifier> = {
    Daily: "daily",
    Weekly: "weekly",
    Monthly: "monthly",
    Yearly: "yearly",
  };

  const specifier = freqMap[label];
  if (!specifier) return null;

  return {
    frequency: {
      specifier,
      value: 1,
    },
    duration: {
      specifier: "forever",
      value: null,
    },
  };
};

// Turn repeat rule from back end to a label for frontend
const formatRepeatRule = (rule?: RepeatRule | null): string | null => {
  if (!rule || !rule.frequency || !rule.frequency.specifier) return null;

  switch (rule.frequency.specifier) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return null;
  }
};

// --- Task Item Component ---
const TaskItem = ({ task, theme, onToggle, onDelete, onPress }: any) => {
    const anim = useRef(new Animated.Value(1)).current; // 1 => visible, 0 => hidden

    const handleDeletePress = () => {
        Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
        }).start(() => {
            onDelete(task.id);
        });
    };

    const animatedStyle = { opacity: anim } as any;

    const renderRightActions = (_progress: any, _dragX: any) => {
        const maxWidth = width * 0.25; // 25% of screen width

        return (
        <Animated.View style={[{ opacity: anim }]}>
            <RectButton
            style={[
                styles.rightAction,
                {
                backgroundColor: "#ff4d4f",
                width: maxWidth,
                },
            ]}
            onPress={handleDeletePress}
            >
            <View style={styles.trashIconContainer}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
            </View>
            </RectButton>
        </Animated.View>
        );
    };

    const dueLabel = unixToDisplayDate(task.due_date);
    const repeatLabel = formatRepeatRule(task.repeat_rule);

    return (
        <ReanimatedSwipeable
            renderRightActions={renderRightActions}
            overshootRight={false}
            rightThreshold={40}
            friction={2}
        >
            <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(task.id)}>
                <Animated.View
                style={[
                    styles.taskCard,
                    animatedStyle,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                ]}
                >
                    <View style={styles.taskTextContent}>
                        <Text style={[styles.taskTitle, { color: theme.secondaryText }]}>
                            {task.name}
                        </Text>
                        <Text style={[styles.taskDueDate, { color: theme.secondaryText }]}>
                            {dueLabel}
                            {repeatLabel ? ` • ${repeatLabel}` : ""}
                        </Text>
                    </View>
                    <View style={styles.rightControls}>
                        <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => onToggle(task.id)}
                        >
                            <View
                                style={[
                                    styles.checkboxBox,
                                    {
                                        borderColor: theme.secondaryText,
                                        backgroundColor: task.completed ? theme.primary : "transparent",
                                    },
                                ]}
                            >
                                {task.completed && (
                                    <Ionicons name="checkmark-sharp" size={16} color={theme.text} />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </ReanimatedSwipeable>
    );
};

// --- Category Tag Component ---
const CategoryTag = ({ category, theme, isActive, onPress, onLongPress }: any) => {
    const tagStyle = {
        backgroundColor: isActive ? theme.primary : theme.border,
        borderColor: theme.primary,
    };
    const textStyle = {
        color: isActive ? theme.text : theme.secondaryText,
    };

    return (
        <TouchableOpacity 
            style={[styles.categoryTag, tagStyle]} 
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={1000}
        >
            <Text style={[styles.categoryText, textStyle]}>{category}</Text>
        </TouchableOpacity>
    );
};

export default function TasksScreen() {
    // pull tasks from Zustand
    const userId = useUserStore((s) => s.userId);
    const tasks = useTasksStore((s) => s.tasks);
    const insertTask = useTasksStore((s) => s.insertTask);
    const updateTask = useTasksStore((s) => s.updateTask);
    const removeTask = useTasksStore((s) => s.removeTask);

    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [date, setDate] = useState(new Date());
    const display = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filter Tasks for selected Date
    const filtered = tasks.filter((t) => {
        const taskDate = unixToDate(t.due_date);
        const matchDate = !taskDate
        ? true
        : (
            taskDate.getFullYear() === date.getFullYear() &&
            taskDate.getMonth() === date.getMonth() &&
            taskDate.getDate() === date.getDate()
        );

        const matchCategory = !selectedCategory || t.cat === selectedCategory;

        return matchDate && matchCategory;
    });

    // Sort the filtered tasks
    const sorted = filtered.sort((a, b) => {
        const aNoDate = !a.due_date || a.due_date === 0;
        const bNoDate = !b.due_date || b.due_date === 0;

        // If A has no date and B has one -> A should go after B
        if (aNoDate && !bNoDate) return 1;

        // If B has no date and A has one -> B should go after A
        if (!aNoDate && bNoDate) return -1;

        // If both no-date or both dated -> keep original order
        return  a.name.localeCompare(b.name);
    });
    

    // Modal states
    const [isNewCategoryModalVisible, setIsNewCategoryModalVisible] = useState(false);
    const [isNewTaskModalVisible, setIsNewTaskModalVisible] = useState(false);
    const [categoriesList, setCategoriesList] = useState<string[]>([]);
    
    // derive categories from tasks whenever tasks change
    useEffect(() => {
    const fromTasks = Array.from(
        new Set(
        tasks
            .map((t) => t.cat)
            .filter((c): c is string => !!c)
        )
    ).sort();

    // merge with any ad-hoc UI categories (e.g. just added, no tasks yet)
    setCategoriesList((prev) => {
        const merged = new Set([...prev, ...fromTasks]);
        return Array.from(merged).sort();
    });
    }, [tasks]);

    // Category context menu states
    const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
    const [selectedCategoryForMenu, setSelectedCategoryForMenu] = useState<string | null>(null);
    const [isEditCategoryModalVisible, setIsEditCategoryModalVisible] = useState(false);
    const [editCategoryName, setEditCategoryName] = useState("");
    
    const [isEditTaskModalVisible, setIsEditTaskModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState<any | null>(null);

    // Form states
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newTask, setNewTask] = useState<{
        title: string;
        description: string;
        category: string;
        repeatLabel: string; // "None" | "Daily" | "Weekly" | ...
        dueDate: string; // MM/DD/YYYY
    }>({
        title: "",
        description: "",
        category: "",
        repeatLabel: "",
        dueDate: "",
    });

    const [isRepeatOpen, setIsRepeatOpen] = useState(false);
    const [dateError, setDateError] = useState("");
    const [taskNameError, setTaskNameError] = useState("");
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [loading, setLoading] = useState(false);

    // Animation helpers
    const fadeIn = () => {
        Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        }).start();
    };

    const fadeOut = (onComplete: () => void) => {
        Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        }).start(onComplete);
    };

    // Update all tasks with a given category name -> new category name
    const renameTasksCategory = async (oldName: string, newName: string) => {
        // Find all tasks that is in that category
        const tasksToUpdate = tasks.filter((t) => t.cat === oldName);

        // Optimistically update the local store
        tasksToUpdate.forEach((t) => {
            updateTask(t.id, { cat: newName });
        });

        // PATCH calls in the background sequentially
        for (const t of tasksToUpdate) {
            try {
                const res = await tasksApi.update({id: t.id, cat: newName});
                if (!res.ok) {
                    console.log("Failed to update category on backend");
                }
            }
            catch (error) {
                console.log("Network error");
            }
        }
    };

    // Set cat to null in all relevant when deleting a category
    const clearTasksCategory = async (name: string) => {
        // Find all tasks that is in that category
        const tasksToUpdate = tasks.filter((t) => t.cat === name);

        // Optimistically update the local store
        tasksToUpdate.forEach((t) => {
            updateTask(t.id, { cat: null });
        });

        // PATCH calls in the background sequentially
        for (const t of tasksToUpdate) {
            try {
                const res = await tasksApi.update({id: t.id, cat:null});
                if (!res.ok) {
                    console.log("Failed to delete category on backend");
                }
            }
            catch (error) {
                console.log("Network error");
            }
        }
    };

    // Category handlers
    const handleCategoryLongPress = (category: string) => {
        setSelectedCategoryForMenu(category);
        setCategoryMenuVisible(true);
        fadeIn();
    };

    const handleEditCategory = () => {
        if (selectedCategoryForMenu) {
            setEditCategoryName(selectedCategoryForMenu);
            fadeOut(() => {
                setCategoryMenuVisible(false);
                setTimeout(() => {
                    setIsEditCategoryModalVisible(true);
                    fadeIn();
                }, 100);
            });
        }
    };

    const handleDeleteCategory = () => {
        if (!selectedCategoryForMenu) return;
        const toDelete = selectedCategoryForMenu;

        // Update UI categories
        setCategoriesList((prev) => prev.filter((cat) => cat !== toDelete));

        // Clear selection if needed
        if (selectedCategory === toDelete) {
            setSelectedCategory(null);
        }
        
        // Delete category in the background
        clearTasksCategory(toDelete).catch((error) => {
            console.log("Failed to delete category", error);
        });

        fadeOut(() => setIsEditCategoryModalVisible(false));
    };

    const handleSaveEditCategory = () => {
        if (!selectedCategoryForMenu) return;

        const oldName = selectedCategoryForMenu;
        const newName = editCategoryName.trim();
        if (!newName) return;

        // Update UI categories
        setCategoriesList((prev) => prev.map((cat) => (cat === oldName ? newName : cat)));

        // Update current selection if needed
        if (selectedCategory === oldName) {
            setSelectedCategory(newName);
        }

        // Update category in the background
        renameTasksCategory(oldName, newName).catch((error) => {
            console.log("Failed to update category", error);
        });

        fadeOut(() => setIsEditCategoryModalVisible(false));
    };

    const handleEditTask = (id: string) => {
        const taskToEdit = tasks.find((t) => t.id === id);
        if (!taskToEdit) return;

        setEditingTask({
            id: taskToEdit.id,
            title: taskToEdit.name,
            description: taskToEdit.desc,
            category: taskToEdit.cat ?? null,
            repeatLabel: formatRepeatRule(taskToEdit.repeat_rule) || "",
            dueDate: unixToDisplayDate(taskToEdit.due_date),
        });

        setIsEditTaskModalVisible(true);
        setDateError("");
    };

    // Toggle completion using the store
    const handleToggleTask = (id: string) => {
        const t = tasks.find((task) => task.id === id);
        if (!t) return;
        updateTask(id, { completed: !t.completed });
    };

    // Delete Task
    const handleDeleteTask = async (id: string) => {
        const existing = tasks.find((t) => t.id === id);
        if (existing) {
            console.log(`Deleting Task: ${existing?.name}`)
        }
        
        // Optimistically remove from UI
        removeTask(id);

        const res = await tasksApi.remove(id);

        if (!res.ok) {
            console.log("Failed to delete task:", res.status, res.message, res.detail);
            // roll back in Zustand if delete failed
            if (existing) {
                insertTask(existing);
            }
            return;
        }
        console.log(`Task Deleted`)
    };

    // Calculate tasks completed (for the header)
    const completedCount = tasks.filter((t) => t.completed).length;

    const createTask = async () => {
        const title = newTask.title.trim();
        const dueDateRaw = newTask.dueDate.trim();
        const repeatRule = buildRepeatRuleFromLabel(newTask.repeatLabel);

        if (!title) {
            setTaskNameError("Task name is required");
            return;
        }
        if (!dueDateRaw) {
            setDateError("Due date is required");
            return;
        }
        if (!isValidDateFormat(dueDateRaw)) {
            setDateError("Invalid date format. Use MM/DD/YYYY");
            return;
        }

        if (!userId) {
            console.log("NO user id");
            router.replace("/login");
            return;
        }

        setLoading(true);
        setDateError("");
        const dueTimestamp = dateStringToUnix(dueDateRaw);

        try {
            const payload = {
                user_id: userId,
                name: title,
                desc: newTask.description?.trim() || "",
                cat: newTask.category || null,
                due_date: dueTimestamp,
                repeat_rule: repeatRule,
            };

            const res = await tasksApi.create(payload);
            if (!res.ok || !res.data) {
                console.log("Failed to create task:", res.status, res.message, res.detail);
                setDateError(
                    typeof res.message === "string"
                    ? res.message
                    : "Failed to create task"
                );
                return;
            }

            const created = res.data; // { id, user_id, name, desc, cat, repeat, due_date, ... }

            console.log(
                `Task Created: Task ID: ${created.id}, Task name: ${created.name}, description: ${created.desc}, category: ${created.cat}, 
                    repeat_rule: ${formatRepeatRule(created.repeat_rule) ?? "None"}, due_date: ${unixToDisplayDate(created.due_date)}`
            );

            if (created.id) {
                // Persist in Zustand
                insertTask({
                    ...created,
                    completed: false,
                });
            }

            // reset + close
            setNewTask({
                title: "",
                description: "",
                category: "",
                repeatLabel: "",
                dueDate: "",
            });
            fadeOut(() => setIsNewTaskModalVisible(false));
        } finally {
        setLoading(false);
        }
    };

    const updateExistingTask = async () => {
        if (!editingTask || !editingTask.title.trim()) return;
        setLoading(true);
        try {
            const dueTimestamp = dateStringToUnix(editingTask.dueDate);
            const repeatRule = buildRepeatRuleFromLabel(editingTask.repeatLabel);
            
            const res = await tasksApi.update({
                id: editingTask.id,
                name: editingTask.title,
                desc: editingTask.description,
                cat: editingTask.category,
                due_date: dueTimestamp,
                repeat_rule: repeatRule,
                
            });
            if (res.ok && res.data) {
                console.log("Task Updated");
                updateTask(editingTask.id, res.data);
                
            } else {
                console.log("Update failed", res.message);
            }

            fadeOut(() => setIsEditTaskModalVisible(false));
            setEditingTask(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* 1. Top Navigation Bar */}
            <HeaderBar
                title="Tasks"
                showTitle={false}
                onNotificationPress={() => {}}
                onSettingsPress={() => {
                router.push("../settings");
                }}
            />

            {/* Content ScrollView */}
            <ScrollView
                contentContainerStyle={[styles.contentScrollView, { paddingBottom: 100 }]}
            >
                {/* 2. Date Selector */}
                <View style={styles.dateSelectorSection}>
                    <TouchableOpacity
                        onPress={() =>
                            setDate(
                                (d) =>
                                new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
                            )
                        }
                    >
                        <Ionicons name="chevron-back" size={30} color={theme.text} />
                    </TouchableOpacity>

                    <View
                        style={[styles.dateBox, { backgroundColor: theme.cardBackground }]}
                    >
                        <Text style={[styles.dateText, { color: theme.secondaryText }]}>
                            {display}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() =>
                            setDate(
                                (d) =>
                                new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
                            )
                        }
                    >
                        <Ionicons name="chevron-forward" size={30} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <Text
                    style={[styles.tasksCompletedText, { color: theme.cardBackground }]}
                >
                    {completedCount} Tasks Completed
                </Text>

                {/* 3. Categories Header and Tags */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Categories
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setIsNewCategoryModalVisible(true);
                            fadeIn();
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* New Category Modal */}
                <Modal
                    transparent={true}
                    visible={isNewCategoryModalVisible}
                    onRequestClose={() => {
                        fadeOut(() => setIsNewCategoryModalVisible(false));
                    }}
                    animationType="none"
                >
                    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => fadeOut(() => setIsNewCategoryModalVisible(false))}
                        />
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
                            accessible={true}
                            accessibilityLabel="Close new category"
                            onPress={() =>
                                fadeOut(() => setIsNewCategoryModalVisible(false))
                            }
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>✕</Text>
                        </Pressable>
                        <Text
                            style={[styles.modalTitle, { color: theme.background }]}
                        >
                            New Category
                        </Text>

                        <View style={styles.inputContainer}>
                            <Text
                                style={[styles.inputLabel, { color: theme.background }]}
                            >
                                Category Name
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    { color: theme.background, borderColor: theme.background },
                                ]}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                                placeholder="Enter category name"
                                placeholderTextColor={theme.background + "80"}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.primary }]}
                            onPress={() => {
                                if (newCategoryName.trim()) {
                                    setCategoriesList((prev) => [
                                        ...prev,
                                        newCategoryName.trim(),
                                    ]);
                                    setNewCategoryName("");
                                    fadeOut(() => setIsNewCategoryModalVisible(false));
                                }
                            }}
                        >
                            <Text style={[styles.saveButtonText, { color: "#fff" }]}>
                                Add Category
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </Modal>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryTagsContainer}
                >
                    {categoriesList.map((cat, index) => (
                        <CategoryTag
                            key={index}
                            category={cat}
                            theme={theme}
                            isActive={cat === selectedCategory}
                            onPress={() =>setSelectedCategory(cat === selectedCategory ? null : cat)}
                            onLongPress={() => handleCategoryLongPress(cat)}
                        />
                    ))}
                </ScrollView>

                {/* Category Context Menu Modal */}
                <Modal
                    transparent={true}
                    visible={categoryMenuVisible}
                    onRequestClose={() => fadeOut(() => setCategoryMenuVisible(false))}
                    animationType="none"
                >
                    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => fadeOut(() => setCategoryMenuVisible(false))}
                        />
                        <Animated.View
                            style={[
                                styles.contextMenuContent,
                                {
                                    backgroundColor: theme.cardBackground,
                                    transform: [{
                                        scale: fadeAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.95, 1]
                                        })
                                    }]
                                }
                            ]}
                        >
                            <TouchableOpacity
                                style={[styles.contextMenuItem, { backgroundColor: theme.primary }]}
                                onPress={handleEditCategory}
                            >
                                <Ionicons name="pencil" size={20} color="#fff" />
                                <Text style={[styles.contextMenuText, { color: '#fff' }]}>Edit</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.contextMenuItem, { backgroundColor: theme.primary }]}
                                onPress={handleDeleteCategory}
                            >
                                <Ionicons name="trash" size={20} color="#fff" />
                                <Text style={[styles.contextMenuText, { color: '#fff' }]}>Delete</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </Modal>

                {/* Edit Category Modal */}
                <Modal
                    transparent={true}
                    visible={isEditCategoryModalVisible}
                    onRequestClose={() => fadeOut(() => setIsEditCategoryModalVisible(false))}
                    animationType="none"
                >
                    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => fadeOut(() => setIsEditCategoryModalVisible(false))}
                        />
                        <Animated.View
                            style={[
                                styles.modalContent,
                                {
                                    backgroundColor: theme.border,
                                    transform: [{
                                        scale: fadeAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.95, 1]
                                        })
                                    }]
                                }
                            ]}
                        >
                            <Pressable
                                accessible={true}
                                accessibilityLabel="Close edit category"
                                onPress={() => fadeOut(() => setIsEditCategoryModalVisible(false))}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                            <Text style={[styles.modalTitle, { color: theme.background }]}>Edit Category</Text>
                            
                            {/* Task Name */}
                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>Category Name</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.background, borderColor: theme.background }]}
                                    value={editCategoryName}
                                    onChangeText={setEditCategoryName}
                                    placeholder="Enter category name"
                                    placeholderTextColor={theme.background + '80'}
                                />
                            </View>
                            

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                                onPress={handleSaveEditCategory}
                            >
                                <Text style={[styles.saveButtonText, { color: '#fff' }]}>Save Changes</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </Modal>

                {/* Tasks List Header */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Tasks</Text>
                    <TouchableOpacity onPress={() => {
                        setIsNewTaskModalVisible(true);
                        setDateError("");
                        setTaskNameError("");
                        fadeIn();
                    }}
                >
                    <Ionicons name="add-circle-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <NewTaskModal
                visible={isNewTaskModalVisible}
                theme={theme}
                categoriesList={categoriesList}
                newTask={newTask}
                setNewTask={setNewTask}
                isRepeatOpen={isRepeatOpen}
                setIsRepeatOpen={setIsRepeatOpen}
                dateError={dateError}
                taskNameError={taskNameError}
                loading={loading}
                onClose={() => {
                    setIsNewTaskModalVisible(false);
                }}
                onSubmit={createTask}
            />

            <EditTaskModal
                visible={isEditTaskModalVisible}
                theme={theme}
                categoriesList={categoriesList}
                editingTask={editingTask}
                setEditingTask={setEditingTask}
                isRepeatOpen={isRepeatOpen}
                setIsRepeatOpen={setIsRepeatOpen}
                dateError={dateError}
                setDateError={setDateError}
                loading={loading}
                onSave={updateExistingTask}
                onRequestClose={() => {
                    setIsEditTaskModalVisible(false);
                    setEditingTask(null);
                }}
            />
            
            {/* 5. To-Do List Items */}
            <View style={styles.taskListContainer}>
                {sorted.map((task) => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        theme={theme}
                        onPress={handleEditTask}
                        onToggle={handleToggleTask}
                        onDelete={handleDeleteTask}
                    />
                ))}
            </View>
            </ScrollView>
        </View>
    );
}

// -------------------------------------------------------------------
// --- STYLES ---
// -------------------------------------------------------------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Modal Styles
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
        color: "#1D3B53",
    },
    headerBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: width * 0.05,
        paddingBottom: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        width: "100%",
        zIndex: 10,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    iconButton: {
        padding: 8,
    },
    contentScrollView: {
        paddingHorizontal: width * 0.05,
    },
    dateSelectorSection: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 20,
    },
    dateBox: {
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 15,
    },
    dateText: {
        fontSize: 24,
        fontWeight: "700",
    },
    tasksCompletedText: {
        textAlign: "center",
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
    },
    categoryTagsContainer: {
        flexDirection: "row",
        paddingVertical: 5,
        marginBottom: 20,
    },
    categoryTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 5,
        marginRight: 10,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "600",
    },
    taskListContainer: {
        gap: 10,
        paddingBottom: 20,
    },
    taskCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 5,
        padding: 15,
        minHeight: 50,
        borderWidth: 1,
    },
    taskTextContent: {
        flex: 1,
        marginRight: 10,
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: "600",
    },
    taskDueDate: {
        fontSize: 10,
        fontWeight: "600",
        marginTop: 2,
    },
    checkbox: {
        padding: 5,
    },
    checkboxBox: {
        width: 20,
        height: 20,
        borderRadius: 3,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    rightControls: {
        flexDirection: "row",
        alignItems: "center",
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
        borderRadius: 6,
    },
    rightAction: {
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
    },
    trashIconContainer: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    contextMenuContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        width: '50%',
        maxWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        gap: 8,
    },
    contextMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        gap: 8,
        borderRadius: 8,
    },
    contextMenuText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
