import React, { useState, createContext, useContext } from "react";
import Notifications from "@/components/notifications";
import { Stack } from "expo-router";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeaderBar } from "@/components/header-bar";

// Context to provide notification modal handler
const NotificationContext = createContext({ showNotifications: () => { } });
export const useNotificationModal = () => useContext(NotificationContext);

function ThemedStack() {
  const { themeName } = useTheme();

  // Using `key={themeName}` forces the navigator to remount when the theme changes,
  // ensuring all screens re-read the new theme values immediately.
  return (
    <Stack
      key={themeName}
      screenOptions={{ headerShown: false }}
      initialRouteName="login"
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-pass" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [notifVisible, setNotifVisible] = useState(false);
  const showNotifications = () => setNotifVisible(true);
  const hideNotifications = () => setNotifVisible(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NotificationContext.Provider value={{ showNotifications }}>
          <>
            <ThemedStack />
            {/* Render Notifications last so it is always on top */}
            <Notifications visible={notifVisible} onClose={hideNotifications} />
          </>
        </NotificationContext.Provider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
