import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";

import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/header-bar"

const { width } = Dimensions.get("window");

// --- Mock Data ---
const taskList = [
    { id: 1, title: "Buy work clothes", subtitle: "9/17/2025", completed: false },
    { id: 2, title: "Distributed Network HW", subtitle: "9/17/2025 at 5:00 PM", completed: false },
    { id: 3, title: "Exercise", subtitle: "Daily", completed: false },
    { id: 4, title: "Research Paper Draft", subtitle: "Tomorrow", completed: false },
    { id: 5, title: "Groceries", subtitle: "This Weekend", completed: false },
    { id: 6, title: "Coding Challenge", subtitle: "Daily", completed: false },
    { id: 7, title: "Meal Prep", subtitle: "Saturday Morning", completed: false },
];

const categories = ["Personal", "School", "Routine", "Work", "Errands"];

// --- Task Item Component ---
const TaskItem = ({ task, theme, onToggle }) => (
    <View style={[styles.taskCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.taskTextContent}>
            <Text style={[styles.taskTitle, { color: theme.textSecondary }]}>{task.title}</Text>
            <Text style={[styles.taskSubtitle, { color: theme.secondaryText }]}>{task.subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.checkbox} onPress={() => onToggle(task.id)}>
            <View style={[
                styles.checkboxBox,
                { borderColor: theme.textSecondary, backgroundColor: task.completed ? theme.primary : 'transparent' }
            ]}>
                {task.completed && <Ionicons name="checkmark-sharp" size={16} color={theme.background} />}
            </View>
        </TouchableOpacity>
    </View>
);

// --- Category Tag Component ---
const CategoryTag = ({ category, theme, isActive }) => {
    const tagStyle = {
        backgroundColor: isActive ? theme.primary : theme.border,
        borderColor: theme.primary,
    };
    const textStyle = {
        color: isActive ? theme.text : theme.textSecondary,
    };

    return (
        <TouchableOpacity style={[styles.categoryTag, tagStyle]}>
            <Text style={[styles.categoryText, textStyle]}>{category}</Text>
        </TouchableOpacity>
    );
};


export default function TasksScreen() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [tasks, setTasks] = useState(taskList);
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState("Personal");

    const handleToggleTask = (id) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        );
    };

    // Calculate tasks completed (for the header)
    const completedCount = tasks.filter(t => t.completed).length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            {/* 1. Top Navigation Bar */}
            <HeaderBar
                title="Home"
                showTitle={false}
                onNotificationPress={() => { /* navigation.navigate('Notifications') */ }}
                onSettingsPress={() => { router.push("../settings") }}
            />

            {/* Content ScrollView */}
            <ScrollView contentContainerStyle={[styles.contentScrollView, { paddingBottom: 100 }]}>

                {/* 2. Date Selector */}
                <View style={styles.dateSelectorSection}>
                    <TouchableOpacity>
                        <Ionicons name="chevron-back" size={30} color={theme.text} />
                    </TouchableOpacity>

                    <View style={[styles.dateBox, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.dateText, { color: theme.background }]}>9/17/2025</Text>
                    </View>

                    <TouchableOpacity>
                        <Ionicons name="chevron-forward" size={30} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.tasksCompletedText, { color: theme.secondaryText }]}>
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
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            theme={theme}
                            onToggle={handleToggleTask}
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
    taskSubtitle: {
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
});