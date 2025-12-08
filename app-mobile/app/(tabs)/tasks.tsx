import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Animated as RNAnimated, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { LinearTransition, FadeIn, FadeOut } from "react-native-reanimated";

import { RectButton } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar";
import { useNotificationModal } from "@/app/_layout";

import { tasksApi, type RepeatRule, type FrequencySpecifier } from "@/services/api/tasks-api";
import { useUserStore } from "@/services/stores/users-store";
import { useTasksStore, type Task as StoreTask } from "@/services/stores/tasks-store";

import { NewTaskModal, type NewTask  } from "@/components/task-create-modal";
import { EditTaskModal, type EditingTask } from "@/components/task-edit-modal";
import { CategoryCreateModal } from "@/components/category-create-modal";
import { CategoryEditModal } from "@/components/category-edit-modal";
import { loadTasks } from "@/services/bootstrap/bootstrap";


const { width } = Dimensions.get("window");

// Date Helpers

// MM/DD/YYYY -> valid?
const isValidDateFormat = (dateStr: string) => {
    const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!dateRegex.test(dateStr)) return false;

    const [month, day, year] = dateStr.split("/").map(Number);
    const d = new Date(year, month - 1, day);
    return (
        d.getFullYear() === year &&
        d.getMonth() === month - 1 &&
        d.getDate() === day
    );
};

// MM/DD/YYYY -> Date | null
const parseInputDate = (dateStr: string): Date | null => {
    if (!isValidDateFormat(dateStr)) return null;
    const [month, day, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// Local Date -> "YYYY-MM-DD" (matches backend OccurrencesByDate keys)
const toDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${y}-${pad(m)}-${pad(day)}`;
};

// Backend first_relevant_date (YYYY-MM-DD string or Date) -> Date | null
const normalizeFirstRelevantDate = (
    value?: string | Date | null
): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string") {
        const parts = value.split("-");
        if (parts.length === 3) {
            const [y, m, d] = parts.map(Number);
            if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
                return new Date(y, m - 1, d);
            }
        }
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d;
    }
    return null;
};

// "M/D/YYYY" or "No date"
const firstRelevantToDisplay = (
    value?: string | Date | null
): string => {
    const d = normalizeFirstRelevantDate(value);
    if (!d) return "No date";
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
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

const deriveEndFromRepeatRule = (
    rule?: RepeatRule | null
): { mode: "Forever" | "Until"; dateDisplay: string } => {
    if (!rule || !rule.duration || !rule.duration.specifier) {
        return { mode: "Forever", dateDisplay: "" };
    }

    if (rule.duration.specifier === "forever") {
        return { mode: "Forever", dateDisplay: "" };
    }

    if (rule.duration.specifier === "until_date" && rule.duration.value) {
        const d = normalizeFirstRelevantDate(rule.duration.value as any);
        if (!d) return { mode: "Until", dateDisplay: "" };
        return {
            mode: "Until",
            dateDisplay: `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
        };
    }

    return { mode: "Forever", dateDisplay: "" };
};

// Task Animation
function TaskItemWrapper({ children }: { children: React.ReactNode }) {
    return (
        <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            layout={LinearTransition.springify().duration(1000)} // Animation here
            style={{ width: "100%" }}
        >
            {children}
        </Animated.View>
    )
};

// --- Task Item Component ---
const TaskItem = ({ task, theme, isCompleted, onToggle, onDelete, onPress }: any) => {
    const anim = useRef(new RNAnimated.Value(1)).current; // 1 => visible, 0 => hidden

    const handleDeletePress = () => {
        RNAnimated.timing(anim, {
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
            <RNAnimated.View style={[{ opacity: anim }]}>
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
            </RNAnimated.View>
        );
    };

    const dueLabel = firstRelevantToDisplay(task.first_relevant_date);
    const repeatLabel = formatRepeatRule(task.repeat_rule);

    return (
        <ReanimatedSwipeable
            renderRightActions={renderRightActions}
            overshootRight={false}
            rightThreshold={40}
            friction={2}
        >
            <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(task.id)}>
                <RNAnimated.View
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
                                        backgroundColor: isCompleted  ? theme.primary : "transparent",
                                    },
                                ]}
                            >
                                {isCompleted  && (
                                    <Ionicons name="checkmark-sharp" size={16} color={theme.text} />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </RNAnimated.View>
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
            onLongPress={(event) => onLongPress(event)}
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
    const occurrencesByDate = useTasksStore((s) => s.occurrencesByDate);
    const completedByDate = useTasksStore((s) => s.completedByDate);
    const toggleOccurrenceCompletion = useTasksStore((s) => s.toggleOccurrenceCompletion);

    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { showNotifications } = useNotificationModal();

    const [date, setDate] = useState(new Date());
    const display = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filter Tasks for selected Date
    const dateKey = toDateKey(date);
    const completedIdsForDay = completedByDate[dateKey] ?? [];

    // Build a quick lookup map: taskId -> task
    const taskById = useMemo(() => {
        const map = new Map<string, StoreTask>();
        for (const t of tasks) {
            map.set(t.id, t);
        }
        return map;
    }, [tasks]);

    // Get all task IDs that actually occur on this date from the backend
    const idsForDay = occurrencesByDate[dateKey] ?? [];

    // Turn IDs into Task objects and apply category filter
    const filtered = idsForDay
        .map((id) => taskById.get(id))
        .filter((t): t is StoreTask => !!t)
        .filter((t) => !selectedCategory || t.cat === selectedCategory);

    // Sort Logic
    const sorted = [...filtered].sort((a, b) => {
        const aCompleted = !!a.completed;
        const bCompleted = !!b.completed;

        if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1;
        }

        const aNoDate = !a.first_relevant_date;
        const bNoDate = !b.first_relevant_date;

        if (aNoDate && !bNoDate) return 1;
        if (!aNoDate && bNoDate) return -1;

        const aDate = normalizeFirstRelevantDate(a.first_relevant_date);
        const bDate = normalizeFirstRelevantDate(b.first_relevant_date);

        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;

        return aDate.getTime() - bDate.getTime();
    });


    // Modal, Category States
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
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const [isEditTaskModalVisible, setIsEditTaskModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState<EditingTask  | null>(null);

    const makeEmptyNewTask = (): NewTask => ({
        title: "",
        description: "",
        category: "",
        repeatLabel: "",
        first_relevant_date: "",
        repeatEnabled: false,
        untilDate: "",
    });

    // Form states
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newTask, setNewTask] = useState<NewTask>(() => makeEmptyNewTask());

    const [isRepeatOpen, setIsRepeatOpen] = useState(false);
    const [dateError, setDateError] = useState("");
    const [taskNameError, setTaskNameError] = useState("");
    const fadeAnimNewCategory = useRef(new RNAnimated.Value(0)).current;
    const fadeAnimEditCategory = useRef(new RNAnimated.Value(0)).current;
    const [loading, setLoading] = useState(false);

    const [repeatEndMode, setRepeatEndMode] = useState<"Forever" | "Until">("Forever");
    const [repeatEndDate, setRepeatEndDate] = useState("");
    const [repeatEndError, setRepeatEndError] = useState("");

    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (!userId) return;
        setRefreshing(true);
        try {
            await loadTasks(userId);
        } catch (err) {
            console.warn("[Tasks] Refresh failed", err);
        } finally {
            setRefreshing(false);
        }
    };

    // Animation helpers
    const fadeInNewCategory = () => {
        RNAnimated.timing(fadeAnimNewCategory, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };
    const fadeOutNewCategory = (onComplete: () => void) => {
        RNAnimated.timing(fadeAnimNewCategory, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start(onComplete);
    };
    const fadeInEditCategory = () => {
        RNAnimated.timing(fadeAnimEditCategory, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };
    const fadeOutEditCategory = (onComplete: () => void) => {
        RNAnimated.timing(fadeAnimEditCategory, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start(onComplete);
    };



    // CATEGORY AND TASKS CATEGORY HELPERS

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
                const res = await tasksApi.update({ id: t.id, cat: newName });
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
                const res = await tasksApi.update({ id: t.id, cat: null });
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
    const handleCategoryLongPress = (category: string, event: any) => {
        setSelectedCategoryForMenu(category);
        setEditCategoryName(category);
        setIsEditCategoryModalVisible(true);
        fadeInEditCategory();
    };

    const handleEditCategory = () => {
        if (selectedCategoryForMenu) {
            setEditCategoryName(selectedCategoryForMenu);
            fadeOutEditCategory(() => {
                setCategoryMenuVisible(false);
                setTimeout(() => {
                    setIsEditCategoryModalVisible(true);
                    fadeInEditCategory();
                }, 100);
            });
        }
    };

    const handleSaveNewCategory = () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        setCategoriesList((prev) => [...prev, trimmed,]);
        setNewCategoryName("");
        fadeOutNewCategory(() => setIsNewCategoryModalVisible(false));
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

        fadeOutEditCategory(() => setIsEditCategoryModalVisible(false));
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

        fadeOutEditCategory(() => setIsEditCategoryModalVisible(false));
    };


    // TASKS handlers

    const handleEditTask = (id: string) => {
        const taskToEdit = tasks.find((t) => t.id === id);
        if (!taskToEdit) return;

        const { mode, dateDisplay } = deriveEndFromRepeatRule(taskToEdit.repeat_rule);

        setEditingTask({
            id: taskToEdit.id,
            title: taskToEdit.name,
            description: taskToEdit.desc,
            category: taskToEdit.cat ?? null,
            repeatLabel: formatRepeatRule(taskToEdit.repeat_rule) || "",
            first_relevant_date: firstRelevantToDisplay(taskToEdit.first_relevant_date),
            repeatEnabled: !!taskToEdit.repeat_rule,
            untilDate: dateDisplay,
        });

        setRepeatEndMode(mode);
        setRepeatEndDate(dateDisplay);
        setRepeatEndError("");
        setIsEditTaskModalVisible(true);
        setDateError("");
    };

    // Toggle completion using the store
    const handleToggleTask = (id: string) => {
        toggleOccurrenceCompletion(dateKey, id);
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
    const completedCount = filtered.filter((t) => completedIdsForDay.includes(t.id)).length;

    // Create tasks
    const createTask = async () => {
        const title = newTask.title.trim();
        

        if (!title) {
            setTaskNameError("Task name is required");
            return;
        }


        if (!userId) {
            console.log("NO user id");
            router.replace("/login");
            return;
        }

        setLoading(true);
        setDateError("");
        setRepeatEndError("");

        try {
            // Determine first relevant date:
            // - If user typed a date, validate & parse MM/DD/YYYY
            // - Otherwise, fall back to the currently selected day
            let firstRelevant: Date | null = null;

            if (newTask.first_relevant_date) {
                const parsed = parseInputDate(newTask.first_relevant_date);
                if (!parsed) {
                    setDateError("Invalid date. Use MM/DD/YYYY.");
                    return;
                }
                firstRelevant = parsed;
            } else {
                firstRelevant = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            }


            // Build repeatRule only when repeatEnabled is true
            let repeatRule: RepeatRule | null = null;
            if (newTask.repeatEnabled && newTask.repeatLabel) {
                const freqMap: Record<string, FrequencySpecifier> = {
                    Daily: "daily",
                    Weekly: "weekly",
                    Monthly: "monthly",
                    Yearly: "yearly",
                };

                const specifier = freqMap[newTask.repeatLabel];
                if (specifier) {
                    if (repeatEndMode === "Until") {
                        const endParsed = parseInputDate(repeatEndDate);
                        if (!endParsed) {
                            setRepeatEndError("Invalid end date. Use MM/DD/YYYY.");
                            return;
                        }
                        if (firstRelevant && endParsed < firstRelevant) {
                            setRepeatEndError("End date must be on or after the start date.");
                            return;
                        }

                        repeatRule = {
                            frequency: { specifier, value: 1 },
                            duration: {
                                specifier: "until_date",
                                value: endParsed,
                            },
                        };
                    }   else {
                        // Forever
                        repeatRule = {
                            frequency: { specifier, value: 1 },
                            duration: {
                                specifier: "forever",
                                value: null,
                            },
                        };
                    }
                }
            }

            const payload = {
                user_id: userId,
                name: title,
                desc: newTask.description?.trim() || "",
                cat: newTask.category || null,
                first_relevant_date: firstRelevant,
                repeat_rule: repeatRule,
            };

            const res = await tasksApi.create(payload);
            if (!res.ok || !res.data) {
                console.log("Failed to create task:", res.status, res.message, res.detail);
                setDateError(typeof res.message === "string" ? res.message : "Failed to create task");
                return;
            }

            const created = res.data; // { id, user_id, name, desc, cat, repeat, first_relevant_date, ... }

            console.log(
                `Task Created: Task ID: ${created.id}, Task name: ${created.name}, description: ${created.desc}, category: ${created.cat}, 
                repeat_rule: ${formatRepeatRule(created.repeat_rule) ?? "None"}, first_relevant_date: ${firstRelevantToDisplay(created.first_relevant_date)}`
            );

            if (created.id) {
                // Persist in Zustand
                insertTask({
                    ...created,
                    completed: false,
                });
            }
            await loadTasks(userId);
            // reset + close
            setNewTask({
                title: "",
                description: "",
                category: "",
                repeatLabel: "",
                first_relevant_date: "",
                repeatEnabled: false,
                untilDate: "",
            });
            setRepeatEndMode("Forever");
            setRepeatEndDate("");
            setRepeatEndError("");
            setIsNewTaskModalVisible(false);
        } finally {
            setLoading(false);
        }
    };

    // Update tasks
    const updateExistingTask = async () => {
        if (!editingTask || !editingTask.title.trim()) return;
        setLoading(true);
        setRepeatEndError("");
        setDateError("");

        try {
            let firstRelevant: Date | null | undefined;
            if (
                !editingTask.first_relevant_date  ||
                editingTask.first_relevant_date  === "No date" ||
                editingTask.first_relevant_date  === "No due date"
            ) {
                // Explicitly clear date
                firstRelevant = null;
            } else {
                const parsed = parseInputDate(editingTask.first_relevant_date);
                if (!parsed) {
                    setDateError("Invalid date. Use MM/DD/YYYY.");
                    return;
                }
                firstRelevant = parsed;
            }

            let repeatRule: RepeatRule | null = null;
            if (editingTask.repeatLabel) {
                const freqMap: Record<string, FrequencySpecifier> = {
                    Daily: "daily",
                    Weekly: "weekly",
                    Monthly: "monthly",
                    Yearly: "yearly",
                };

                const specifier = freqMap[editingTask.repeatLabel];
                if (specifier) {
                    if (repeatEndMode === "Until") {
                        const endParsed = parseInputDate(repeatEndDate);
                        if (!endParsed) {
                            setRepeatEndError("Invalid end date. Use MM/DD/YYYY.");
                            return;
                        }
                        if (firstRelevant && endParsed < firstRelevant) {
                            setRepeatEndError("End date must be on or after the start date.");
                            return;
                        }

                        repeatRule = {
                            frequency: { specifier, value: 1 },
                            duration: {
                                specifier: "until_date",
                                value: endParsed,
                            },
                        };
                    }   else {
                        // Forever
                        repeatRule = {
                            frequency: { specifier, value: 1 },
                            duration: {
                                specifier: "forever",
                                value: null,
                            },
                        };
                    }
                }
            }

            const res = await tasksApi.update({
                id: editingTask.id,
                name: editingTask.title,
                desc: editingTask.description,
                cat: editingTask.category,
                first_relevant_date: firstRelevant,
                repeat_rule: repeatRule,
            });
            if (res.ok && res.data) {
                console.log("Task Updated");
                updateTask(editingTask.id, res.data);
                if (userId) {
                    await loadTasks(userId);
                }

            } else {
                console.log("Update failed", res.message);
            }
            setIsEditTaskModalVisible(false);
            setEditingTask(null);
            setRepeatEndMode("Forever");
            setRepeatEndDate("");
            setRepeatEndError("");
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
                onNotificationPress={showNotifications}
                onSettingsPress={() => {
                    router.push("../settings");
                }}
            />

            {/* Content ScrollView */}
            <ScrollView
                contentContainerStyle={[styles.contentScrollView, { paddingBottom: 100 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
                            fadeInNewCategory();
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Horizontal Scroll for Categories */}
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
                            onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                            onLongPress={(event: any) => handleCategoryLongPress(cat, event)}
                        />
                    ))}
                </ScrollView>

                {/* Tasks List Header */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Tasks</Text>
                    <TouchableOpacity onPress={() => {
                        setNewTask(makeEmptyNewTask());
                        setIsNewTaskModalVisible(true);
                        setIsRepeatOpen(false);
                        setDateError("");
                        setTaskNameError("");
                        setRepeatEndMode("Forever");
                        setRepeatEndDate("");
                        setRepeatEndError("");
                    }}>
                        <Ionicons name="add-circle-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* 5. To-Do List Items */}
                <View style={styles.taskListContainer}>
                    {sorted.length === 0 ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 20 }}>
                            <Text style={{ color: theme.secondaryText, fontSize: 12, opacity: 0.6, textAlign: 'center', fontWeight: '400' }}>
                                You currently have no tasks.
                            </Text>
                        </View>
                    ) : (
                        sorted.map((task) => (
                            <TaskItemWrapper key={task.id}>
                                <TaskItem
                                    task={task}
                                    theme={theme}
                                    isCompleted={completedIdsForDay.includes(task.id)}
                                    onPress={handleEditTask}
                                    onToggle={handleToggleTask}
                                    onDelete={handleDeleteTask}
                                />
                            </TaskItemWrapper>
                        ))
                    )}
                </View>
            </ScrollView>

            <CategoryCreateModal
                visible={isNewCategoryModalVisible}
                fadeAnim={fadeAnimNewCategory}
                theme={theme}
                value={newCategoryName}
                onChangeValue={setNewCategoryName}
                onClose={() => fadeOutNewCategory(() => setIsNewCategoryModalVisible(false))}
                onSubmit={handleSaveNewCategory}
            />

            <CategoryEditModal
                visible={isEditCategoryModalVisible}
                fadeAnim={fadeAnimEditCategory}
                theme={theme}
                value={editCategoryName}
                onChangeValue={setEditCategoryName}
                onClose={() => fadeOutEditCategory(() => setIsEditCategoryModalVisible(false))}
                onSubmit={handleSaveEditCategory}
                onDelete={handleDeleteCategory}
            />

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
                    setNewTask(makeEmptyNewTask());
                    setIsNewTaskModalVisible(false);
                    setIsRepeatOpen(false);
                    setRepeatEndMode("Forever");
                    setRepeatEndDate("");
                    setRepeatEndError("");
                }}
                onSubmit={createTask}
                repeatEndMode={repeatEndMode}
                setRepeatEndMode={setRepeatEndMode}
                repeatEndDate={repeatEndDate}
                setRepeatEndDate={setRepeatEndDate}
                repeatEndError={repeatEndError}
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
                    setRepeatEndMode("Forever");
                    setRepeatEndDate("");
                    setRepeatEndError("");
                    setIsRepeatOpen(false);
                }}
                repeatEndMode={repeatEndMode}
                setRepeatEndMode={setRepeatEndMode}
                repeatEndDate={repeatEndDate}
                setRepeatEndDate={setRepeatEndDate}
                repeatEndError={repeatEndError}
            />
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
        flex: 1,
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
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
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    deleteButton: {
        width: 50,
        height: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
