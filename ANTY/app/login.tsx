import * as React from "react";
import { StyleSheet, View, Text, Pressable, Image, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
// Everything is imported from Figma
export default function Login() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  return (
    <SafeAreaView style={styles.login}>
      <View style={styles.canvas}>
        

        {/* Logo */}
        <Image
          style={styles.logo}
          resizeMode="contain"
          source={require("../assets/app_logo.png")}
        />

        {/* Heading */}
        <Text style={styles.heading}>Sign In</Text>

        {/* Username */}
        <TextInput
          style={[styles.input]}
          placeholder="username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />

        {/* Password */}
        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          placeholder="password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Keep me logged in (static for now) */}
        <View style={styles.row}>
          <View style={styles.checkbox} />
          <Text style={styles.keepMeLogged}>Keep me logged in</Text>
        </View>

        {/* Login button */}
        <Pressable style={styles.loginButton} onPress={() => router.replace("/home")}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  login: {
    flex: 1,
    backgroundColor: "#121212",
  },
  canvas: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  absoluteFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 12,
    color: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginRight: 8,
    backgroundColor: "#121212",
  },
  keepMeLogged: {
    color: "#fff",
    fontSize: 12,
  },
  loginButton: {
    width: "100%",
    height: 44,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  loginButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  link: {
    marginTop: 8,
    color: "#e0e0e0",
    textDecorationLine: "underline",
  },
});
