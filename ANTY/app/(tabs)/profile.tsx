// app/(tabs)/profile.tsx
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
			<View style={{ flex: 1, padding: 24, gap: 16 }}>
				<Text style={{ fontSize: 30, fontWeight: "600", color: "#FFFFFF"}}>Profile</Text>
				<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
				<Text style={{ fontSize: 20, color: "#FFFFFF"}}>Pfp, Bio, Analytics, Badges</Text>
				</View>
			</View>
		</SafeAreaView>
    );
}
