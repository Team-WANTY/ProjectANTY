import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "@/context/ThemeContext";
import { Link, useSegments } from 'expo-router'; // Link for navigation

const { width } = Dimensions.get("window");

// Define your menu items (matching your tab names)
const menuItems = [
    { name: 'home', icon: 'home', label: 'Home' },
    { name: 'tasks', icon: 'book-outline', label: 'Tasks' },
    { name: 'social', icon: 'people-outline', label: 'Social' },
    { name: 'profile', icon: 'person-outline', label: 'Profile' },
];

export default function BottomNavBar() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const segments = useSegments();
    const activeSegment = segments[segments.length - 1]; // Get the current tab name

    // Use the darkest color for the outer container
    const containerBackgroundColor = theme.background;

    return (
        <View style={[styles.menuBarContainer, { backgroundColor: containerBackgroundColor, paddingBottom: insets.bottom + 15 }]}>
            <View style={[styles.menuBar, { backgroundColor: theme.border }]}>
                {menuItems.map((item) => {
                    const isActive = item.name === activeSegment;
                    const iconColor = isActive ? theme.background : theme.secondaryText;

                    return (
                        <Link key={item.name} href={`/${item.name}`} asChild>
                            <TouchableOpacity style={styles.menuItem}>
                                <Ionicons
                                    name={isActive ? item.icon : `${item.icon}`}
                                    size={26}
                                    color={iconColor}
                                />
                            </TouchableOpacity>
                        </Link>
                    );
                })}
            </View>
        </View>
    );
}

// Ensure these styles are defined here
const styles = StyleSheet.create({
    menuBarContainer: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        alignItems: 'center',
        paddingHorizontal: width * 0.05,
        paddingTop: 15, // Space above the pill
    },
    menuBar: {
        width: "100%",
        height: 70,
        borderRadius: 35,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    menuItem: {
        padding: 5,
        alignItems: 'center',
    },
});