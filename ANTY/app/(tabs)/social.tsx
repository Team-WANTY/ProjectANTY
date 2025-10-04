import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SocialScreen() {
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
			<View style={{ flex: 1, padding: 24, gap: 16 }}>
				<Text style={{ fontSize: 30, fontWeight: "600", color: "#FFFFFF"}}>Social</Text>
				<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
				<Text style={{ fontSize: 20, color: "#FFFFFF"}}>Some Posts here and there</Text>
				</View>
			</View>
		</SafeAreaView>
	);    
}
