import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "@/context/ThemeContext";
import { Link, useSegments } from 'expo-router'; // Link for navigation

const { width } = Dimensions.get("window");

// Define your menu items (matching your tab names)
const menuItems = [
    { name: 'home', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { name: 'tasks', icon: 'reader-outline', activeIcon: 'reader', label: 'Tasks' },
    { name: 'social', icon: 'people-outline', activeIcon: 'people', label: 'Social' },
    { name: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
];

export default function BottomNavBar() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const segments = useSegments();
    const activeSegment = segments[segments.length - 1]; // Get the current tab name

    // Theme-dependent styles
    const menuBarContainerStyle = {
        position: "absolute",
        bottom: 0,
        width: "100%",
        alignItems: 'center',
        paddingHorizontal: width * 0.05,
        paddingTop: 15,
        backgroundColor: theme.background,
        paddingBottom: insets.bottom + 15,
    };
    const menuBarStyle = {
        width: "100%",
        height: 70,
        borderRadius: 35,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: theme.border,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    };
    const menuItemStyle = {
        padding: 5,
        alignItems: 'center',
    };

    return (
        <View style={menuBarContainerStyle}>
            <View style={menuBarStyle}>
                {menuItems.map((item) => {
                    const isActive = item.name === activeSegment;
                    const iconName = isActive ? item.activeIcon : item.icon;
                    const iconColor = isActive ? theme.background : theme.secondaryText;

                    return (
                        <Link key={item.name} href={`/${item.name}`} asChild>
                            <TouchableOpacity style={menuItemStyle}>
                                <Ionicons
                                    name={iconName}
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

// ...existing code...