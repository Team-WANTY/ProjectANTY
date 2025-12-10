import React from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onCancel,
    onConfirm,
    loading = false,
    theme
}) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center"
            }}>
                <View style={{
                    width: "80%",
                    backgroundColor: theme.border,
                    padding: 20,
                    borderRadius: 14,
                }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: theme.background }}>
                        {title}
                    </Text>

                    <Text style={{ marginTop: 10, color: theme.background, fontSize: 14 }}>
                        {message}
                    </Text>

                    <View style={{
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        marginTop: 25,
                        gap: 25
                    }}>
                        <TouchableOpacity onPress={onCancel} disabled={loading}>
                            <Text style={{ color: theme.background, fontSize: 16 }}>
                                {cancelLabel}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onConfirm} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color={theme.background} />
                            ) : (
                                <Text style={{ color: "red", fontWeight: "700", fontSize: 16 }}>
                                    {confirmLabel}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
