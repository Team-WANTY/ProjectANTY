import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() 
{
	return (
		<SafeAreaProvider>
			<StatusBar style="light" backgroundColor="#000000" />
			<SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
				<Stack screenOptions={{ headerShown: false}}>
					
					<Stack.Screen name="login" />
					<Stack.Screen name="(tabs)" />
				</Stack>
			</SafeAreaView>
		</SafeAreaProvider>
	);
}
