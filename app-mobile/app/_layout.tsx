import { Stack } from "expo-router";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
