import React, { useState, useRef } from "react";
import { 
    View, 
    Text, 
    ScrollView, 
    StyleSheet, 
    Dimensions, 
    TouchableOpacity, 
    Animated,
    Modal,
    TextInput,
    Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";

import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar"

const { width } = Dimensions.get("window");

// --- Mock Data ---
const taskList = [
    { id: 1, title: "Buy work clothes",       dueDate: "9/17/2025",     category: "Work",       completed: false , dateISO: "2025-09-17"},
    { id: 2, title: "Distributed Network HW", dueDate: "9/17/2025",     category: "School",     completed: false , dateISO: "2025-09-17"},
    { id: 3, title: "Exercise",               dueDate: "9/17/2025",     category: "Routine",    completed: false , dateISO: "2025-09-17"},
    { id: 4, title: "Research Paper Draft",   dueDate: "9/17/2025",     category: "School",     completed: false , dateISO: "2025-09-17"},
    { id: 5, title: "Groceries",              dueDate: "9/17/2025",     category: "Personal",   completed: false , dateISO: "2025-09-17"},
    { id: 6, title: "Coding Challenge",       dueDate: "9/17/2025",     category: "Routine",    completed: false , dateISO: "2025-09-17"},
    { id: 7, title: "Meal Prep",              dueDate: "9/17/2025",     category: "Errands",    completed: false , dateISO: "2025-09-17"},
    { id: 8, title: "Go Buy some meat",       dueDate: "9/18/2025",     category: "Errands",    completed: false , dateISO: "2025-09-18"},
];

// Mock Categories
const categories = ["Personal", "School", "Routine", "Work", "Errands"];

// pad helper
const pad2 = (n: number) => String(n).padStart(2, "0");

// date function
const formatDate = (d: Date) => {
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; // for task filtering, ex 2025-09-18
    const display = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`; // UI display, ex 9/17/2025
    return { iso, display };
};

// --- Task Item Component --
const TaskItem = ({ task, theme, onToggle, onDelete }: any) => {
    const anim = useRef(new Animated.Value(1)).current; // 1 => visible, 0 => hidden

    const handleDeletePress = () => {
        // subtle exit animation (fade + collapse)
        Animated.timing(anim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            onDelete(task.id);
        });
    };

    const animatedStyle = {
        opacity: anim,
    } as any;
    const renderRightActions = (_progress: any, _dragX: any) => {
        const maxWidth = width * 0.25; // 25% of screen width
        
        return (
            <Animated.View style={[{ opacity: anim }]}>
                <RectButton 
                    style={[
                        styles.rightAction, 
                        { 
                            backgroundColor: '#ff4d4f',
                            width: maxWidth,
                        }
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

    return (
        <Swipeable
            renderRightActions={renderRightActions}
            overshootRight={false}
            rightThreshold={40}
            friction={2}>
            <Animated.View style={[styles.taskCard, animatedStyle, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.taskTextContent}>
                    <Text style={[styles.taskTitle, { color: theme.secondaryText }]}>{task.title}</Text>
                    <Text style={[styles.taskDueDate, { color: theme.secondaryText }]}>
                        {task.dueDate}
                        {task.repeat ? ` • ${task.repeat}` : ''}
                    </Text>
                </View>
                <View style={styles.rightControls}>
                    <TouchableOpacity style={styles.checkbox} onPress={() => onToggle(task.id)}>
                        <View style={[
                            styles.checkboxBox,
                            { borderColor: theme.secondaryText, backgroundColor: task.completed ? theme.primary : 'transparent' }
                        ]}>
                            {task.completed && <Ionicons name="checkmark-sharp" size={16} color={theme.text} />}
                        </View>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Swipeable>
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
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [tasks, setTasks] = useState(taskList);
    const router = useRouter();
    
    // Modal states
    const [isNewCategoryModalVisible, setIsNewCategoryModalVisible] = useState(false);
    const [isNewTaskModalVisible, setIsNewTaskModalVisible] = useState(false);
    const [categoriesList, setCategoriesList] = useState(categories);
    
    // Category context menu states
    const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
    const [selectedCategoryForMenu, setSelectedCategoryForMenu] = useState<string | null>(null);
    const [isEditCategoryModalVisible, setIsEditCategoryModalVisible] = useState(false);
    const [editCategoryName, setEditCategoryName] = useState("");
    
    // Form states
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newTask, setNewTask] = useState({
        title: "",
        category: "",
        dueDate: "",
        repeat: "",
    });
    const [isRepeatOpen, setIsRepeatOpen] = useState(false);
    const [dateError, setDateError] = useState("");
    const [taskNameError, setTaskNameError] = useState("");
    const fadeAnim = useRef(new Animated.Value(0)).current;

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
        if (selectedCategoryForMenu) {
            setCategoriesList(prev => prev.filter(cat => cat !== selectedCategoryForMenu));
            // Also clear the selection if the deleted category was selected
            if (selectedCategory === selectedCategoryForMenu) {
                setSelectedCategory(null);
            }
            fadeOut(() => setCategoryMenuVisible(false));
        }
    };

    const handleSaveEditCategory = () => {
        if (selectedCategoryForMenu && editCategoryName.trim()) {
            setCategoriesList(prev => 
                prev.map(cat => cat === selectedCategoryForMenu ? editCategoryName.trim() : cat)
            );
            // Update selectedCategory if it was the edited one
            if (selectedCategory === selectedCategoryForMenu) {
                setSelectedCategory(editCategoryName.trim());
            }
            fadeOut(() => {
                setIsEditCategoryModalVisible(false);
                setEditCategoryName("");
                setSelectedCategoryForMenu(null);
            });
        }
    };

    // Date validation helper
    const isValidDateFormat = (date: string) => {
        const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
        if (!dateRegex.test(date)) return false;
        
        const [month, day, year] = date.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day);
        return dateObj.getMonth() === month - 1 && 
               dateObj.getDate() === day && 
               dateObj.getFullYear() === year;
    };
    
    // date state
    const [date, setDate] = useState(new Date(2025, 8, 17)); // 0 indexed month so 0 - Jan, 1 - Feb... 
    const { iso: selectedDate, display } = formatDate(date);

    // state: no category selected by default, show all tasks when no category selected
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // task filtering logic: filter by date, then filter by category
    const filtered = tasks.filter(t => {
        const dateMatch = t.dateISO === selectedDate;
        const categoryMatch = !selectedCategory || t.category === selectedCategory; 
        return dateMatch && categoryMatch;
    });

    const handleToggleTask = (id: number) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        );
    };

    const handleDeleteTask = (id: number) => {
        setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
    };

    // Calculate tasks completed (for the header)
    const completedCount = tasks.filter(t => t.completed).length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            {/* 1. Top Navigation Bar */}
            <HeaderBar
                title="Tasks"
                showTitle={false}
                onNotificationPress={() => { /* navigation.navigate('Notifications') */ }}
                onSettingsPress={() => { router.push("../settings") }}
            />

            {/* Content ScrollView */}
            <ScrollView contentContainerStyle={[styles.contentScrollView, { paddingBottom: 100 }]}>

                {/* 2. Date Selector */}
                <View style={styles.dateSelectorSection}>
                    <TouchableOpacity onPress={() => setDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()-1))}>
                        <Ionicons name="chevron-back" size={30} color={theme.text} />
                    </TouchableOpacity>

                    <View style={[styles.dateBox, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.dateText, { color: theme.secondaryText }]}>{display}</Text>
                    </View>

                    <TouchableOpacity onPress={() => setDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()+1))}>
                        <Ionicons name="chevron-forward" size={30} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.tasksCompletedText, { color: theme.cardBackground }]}>
                    {completedCount} Tasks Completed
                </Text>

                {/* 3. Categories Header and Tags */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
                    <TouchableOpacity onPress={() => {
                        setIsNewCategoryModalVisible(true);
                        fadeIn();
                    }}>
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
                                accessibilityLabel="Close new category"
                                onPress={() => fadeOut(() => setIsNewCategoryModalVisible(false))}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                            <Text style={[styles.modalTitle, { color: theme.background }]}>New Category</Text>
                            
                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>Category Name</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.background, borderColor: theme.background }]}
                                    value={newCategoryName}
                                    onChangeText={setNewCategoryName}
                                    placeholder="Enter category name"
                                    placeholderTextColor={theme.background + '80'}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                                onPress={() => {
                                    if (newCategoryName.trim()) {
                                        setCategoriesList(prev => [...prev, newCategoryName.trim()]);
                                        setNewCategoryName("");
                                        fadeOut(() => setIsNewCategoryModalVisible(false));
                                    }
                                }}
                            >
                                <Text style={[styles.saveButtonText, { color: '#fff' }]}>Add Category</Text>
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
                        fadeIn();
                    }}>
                        <Ionicons name="add-circle-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* New Task Modal */}
                <Modal
                    transparent={true}
                    visible={isNewTaskModalVisible}
                    onRequestClose={() => {
                        fadeOut(() => setIsNewTaskModalVisible(false));
                    }}
                    animationType="none"
                >
                    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => fadeOut(() => setIsNewTaskModalVisible(false))}
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
                                accessibilityLabel="Close new task"
                                onPress={() => fadeOut(() => setIsNewTaskModalVisible(false))}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                            <Text style={[styles.modalTitle, { color: theme.background }]}>New Task</Text>
                            
                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>Task Name</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        { 
                                            color: theme.background, 
                                            borderColor: taskNameError ? '#ff4d4f' : theme.background 
                                        }
                                    ]}
                                    value={newTask.title}
                                    onChangeText={(text) => {
                                        setTaskNameError("");
                                        setNewTask(prev => ({ ...prev, title: text }))
                                    }}
                                    placeholder="Enter task name"
                                    placeholderTextColor={theme.background + '80'}
                                />
                                {taskNameError ? (
                                    <Text style={styles.errorText}>{taskNameError}</Text>
                                ) : null}
                            </View>

                            {/* Description removed per request */}

                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                    {categoriesList.map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.categoryOption,
                                                {
                                                    backgroundColor: newTask.category === cat ? theme.primary : 'transparent',
                                                    borderColor: theme.background
                                                }
                                            ]}
                                            onPress={() => setNewTask(prev => ({ ...prev, category: cat }))}
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryOptionText,
                                                    { color: newTask.category === cat ? '#fff' : theme.background }
                                                ]}
                                            >
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Repeat Dropdown */}
                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>Repeat</Text>
                                <Pressable
                                    style={[styles.dropdown, { borderColor: theme.background }]}
                                    onPress={() => setIsRepeatOpen((o) => !o)}
                                >
                                    <Text style={[styles.dropdownText, { color: theme.background }]}>{newTask.repeat || 'None'}</Text>
                                    <Ionicons name="chevron-down" size={18} color={theme.background} />
                                </Pressable>
                                {isRepeatOpen && (
                                    <View style={[styles.dropdownMenu, { backgroundColor: theme.cardBackground, borderColor: theme.background }] }>
                                        {['None','Daily','Weekly','Monthly','Yearly'].map((opt) => (
                                            <TouchableOpacity
                                                key={opt}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    const value = opt === 'None' ? '' : opt;
                                                    setNewTask(prev => ({ ...prev, repeat: value }));
                                                    setIsRepeatOpen(false);
                                                }}
                                            >
                                                <Text style={[styles.dropdownItemText, { color: theme.secondaryText }]}>{opt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.background }]}>Due Date (MM/DD/YYYY)</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.background, borderColor: theme.background }]}
                                    value={newTask.dueDate}
                                    onChangeText={(text) => {
                                        setNewTask(prev => ({ ...prev, dueDate: text }));
                                        setDateError("");
                                    }}
                                    placeholder="MM/DD/YYYY"
                                    placeholderTextColor={theme.background + '80'}
                                />
                                {dateError ? (
                                    <Text style={styles.errorText}>{dateError}</Text>
                                ) : null}
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                                onPress={() => {
                                    if (!newTask.title.trim()) {
                                        setTaskNameError("Task name is required");
                                        return;
                                    }

                                    // If no due date provided, accept and set to 'no due date'
                                    let dueDateValue = newTask.dueDate.trim();
                                    let dateISOValue = "";

                                    if (dueDateValue === "") {
                                        dueDateValue = "No due date";
                                        // associate to currently selected date so it appears in today's list
                                        dateISOValue = selectedDate;
                                    } else {
                                        if (!isValidDateFormat(dueDateValue)) {
                                            setDateError("Please enter a valid date in MM/DD/YYYY format");
                                            return;
                                        }
                                        const [month, day, year] = dueDateValue.split('/');
                                        const dateObj = new Date(+year, +month - 1, +day);
                                        dateISOValue = formatDate(dateObj).iso;
                                    }

                                    const newTaskItem = {
                                        id: tasks.length + 1,
                                        title: newTask.title.trim(),
                                        category: newTask.category || "",
                                        dueDate: dueDateValue,
                                        dateISO: dateISOValue,
                                        repeat: newTask.repeat || "",
                                        completed: false
                                    };

                                    // Append to the tasks list
                                    setTasks(prev => [...prev, newTaskItem]);

                                    // Reset form
                                    setNewTask({
                                        title: "",
                                        category: "",
                                        dueDate: "",
                                        repeat: "",
                                    });
                                    setTaskNameError("");

                                    // Close modal with fade out
                                    fadeOut(() => setIsNewTaskModalVisible(false));
                                }}
                            >
                                <Text style={[styles.saveButtonText, { color: '#fff' }]}>Add Task</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </Modal>

                {/* 5. To-Do List Items */}
                <View style={styles.taskListContainer}>
                    {filtered.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            theme={theme}
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        borderRadius: 15,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 5,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        minHeight: 40,
    },
    categoryScroll: {
        flexDirection: 'row',
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
        fontWeight: '500',
    },
    saveButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff4d4f',
        fontSize: 14,
        marginTop: 5,
    },
    dropdown: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownText: {
        fontSize: 16,
        fontWeight: '500',
    },
    dropdownMenu: {
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 8,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dropdownItemText: {
        fontSize: 16,
    },
    modalCloseButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 6,
        borderRadius: 12,
        zIndex: 10,
    },
    modalCloseText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1D3B53', // Dark blue from app theme
    },
    // --- Header Bar Styles ---
    headerBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: width * 0.05,
        paddingBottom: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        // Match the rounded header bar design from your other screens
        width: '100%',
        zIndex: 10,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    iconButton: {
        padding: 8,
    },

    // --- Content ScrollView (Main Vertical) ---
    contentScrollView: {
        paddingHorizontal: width * 0.05,
    },

    // --- Date Selector ---
    dateSelectorSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    dateBox: {
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 15,
        // The Figma width was 150px, we use flex to make it adaptable
    },
    dateText: {
        fontSize: 24,
        fontWeight: '700',
    },
    tasksCompletedText: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 20,
    },

    // --- Sections and Categories ---
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    categoryTagsContainer: {
        flexDirection: 'row',
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
        fontWeight: '600',
    },

    // --- Task List ---
    taskListContainer: {
        gap: 10,
        paddingBottom: 20, // Final padding before the bottom menu starts
    },
    taskCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        fontWeight: '600',
    },
    taskDueDate: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    checkbox: {
        padding: 5, // Tappable area
    },
    checkboxBox: {
        width: 20,
        height: 20,
        borderRadius: 3,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
        borderRadius: 6,
    },
    rightAction: {
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%', // Match parent height
    },
    trashIconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
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