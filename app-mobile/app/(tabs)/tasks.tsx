import React, { useState, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Animated } from "react-native";
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
                    <Text style={[styles.taskDueDate, { color: theme.secondaryText }]}>{task.dueDate}</Text>
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
const CategoryTag = ({ category, theme, isActive, onPress }: any) => {
    const tagStyle = {
        backgroundColor: isActive ? theme.primary : theme.border,
        borderColor: theme.primary,
    };
    const textStyle = {
    color: isActive ? theme.text : theme.secondaryText,
    };

    return (
        <TouchableOpacity style={[styles.categoryTag, tagStyle]} onPress={onPress}>
            <Text style={[styles.categoryText, textStyle]}>{category}</Text>
        </TouchableOpacity>
    );
};


export default function TasksScreen() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [tasks, setTasks] = useState(taskList);
    const router = useRouter();
    
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
                    <TouchableOpacity>
                        <Ionicons name="add-circle-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryTagsContainer}
                >
                    {categories.map((cat, index) => (
                        <CategoryTag
                            key={index}
                            category={cat}
                            theme={theme}
                            isActive={cat === selectedCategory}
                            onPress={() =>setSelectedCategory(cat === selectedCategory ? null : cat)}
                        />
                    ))}
                </ScrollView>

                {/* 4. To-Do List Header */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>To-Do List</Text>
                    <TouchableOpacity>
                        <Ionicons name="add-circle-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

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
});