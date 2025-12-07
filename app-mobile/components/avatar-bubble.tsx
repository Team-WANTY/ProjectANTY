import React, { useState } from "react";
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp, ImageStyle } from "react-native";

type AvatarBubbleProps = {
    size: number;
    name: string;
    avatarUrl?: string | null;
    bgColor: string;
    initialColor: string;
    style?: StyleProp<ImageStyle>;
};

export const AvatarBubble: React.FC<AvatarBubbleProps> = ({
    size,
    name,
    avatarUrl,
    bgColor,
    initialColor,
    style,
}) => {
    const [failed, setFailed] = useState(false);
    const initial = name?.[0]?.toUpperCase() ?? "?";
    const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

    // If missing URL or image fails -> fallback to initial
    if (!avatarUrl || failed) {
        return (
            <View style={[styles.fallback, dimensionStyle, { backgroundColor: bgColor }, style]}>
                <Text style={[styles.initial, { color: initialColor }]}>{initial}</Text>
            </View>
        );
    }

    return (
        <Image
            source={{ uri: avatarUrl }}
            style={[dimensionStyle, style]}
            onError={() => setFailed(true)}
        />
    );
};

const styles = StyleSheet.create({
    fallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    initial: {
        fontWeight: "700",
    },
});
