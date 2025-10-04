import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
			<View style={{ flex: 1, padding: 24, gap: 16 }}>
				<Text style={{ fontSize: 30, fontWeight: "600", color: "#FFFFFF"}}>Home</Text>
				<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
				<Text style={{ fontSize: 20, color: "#FFFFFF"}}>Home page shit goes here</Text>
				</View>
			</View>
		</SafeAreaView>
	);      
}
