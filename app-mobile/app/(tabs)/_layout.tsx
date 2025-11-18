import { Tabs } from "expo-router";
import { ThemeProvider } from "@/context/ThemeContext";
import BottomNavBar from "@/components/bottom-nav";
import { useState } from "react";
import { HeaderBar } from "@/components/header-bar"; // correct
import Notifications from "@/components/notifications";

export default function RootLayout() {
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  return (
    <ThemeProvider>
      {showNotifications && (
        <Notifications onClose={toggleNotifications} />
      )}

      <Tabs
        screenOptions={{
          headerShown: false, // hide default headers
          tabBarStyle: { display: "none" },
        }}
        tabBar={({ navigation }) => <BottomNavBar navigation={navigation} />}
      >
        <Tabs.Screen
          name="home"
          options={{
            header: () => (
              <HeaderBar
                title="Home"
                onNotificationPress={toggleNotifications} // <-- functional bell
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            header: () => (
              <HeaderBar
                title="Tasks"
                onNotificationPress={toggleNotifications}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            header: () => (
              <HeaderBar
                title="Social"
                onNotificationPress={toggleNotifications}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            header: () => (
              <HeaderBar
                title="Profile"
                onNotificationPress={toggleNotifications}
              />
            ),
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}