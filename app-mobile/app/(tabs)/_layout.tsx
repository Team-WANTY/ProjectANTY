import { Tabs } from "expo-router";
import { ThemeProvider } from "@/context/ThemeContext";
import BottomNavBar from "@/components/bottom-nav";

export default function RootLayout() {

  return (
    <ThemeProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none',
          },
        }}
        tabBar={({ navigation }) => <BottomNavBar navigation={navigation} />}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="tasks" />
        {/* <Tabs.Screen name="social" /> */}
        {/* <Tabs.Screen name="profile" /> */}
      </Tabs>
    </ThemeProvider>
  );
}