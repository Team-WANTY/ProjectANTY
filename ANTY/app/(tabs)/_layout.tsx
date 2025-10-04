// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#000000",
                tabBarStyle: { backgroundColor: "#FFFFFF" }, 
            }}
        >
            <Tabs.Screen
                /* name of file */
                name="home"
                options={{
                title: "Home",
                tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
                ),
                }}
            />
            <Tabs.Screen
                name="task"
                options={{
                title: "Tasks",
                tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons name={focused ? "reader" : "reader-outline"} size={size} color={color} />
                    
                ),
                }}
            />
            <Tabs.Screen
                name="social"
                options={{
                    title: "Social",
                    tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons name={focused ? "people-circle" : "people-circle-outline"} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({color, size, focused }) => (
                        <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
