import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useNotificationModal } from '@/app/_layout';

const { width } = Dimensions.get('window');

interface HeaderBarProps {
    /** The title to display in the center of the header (e.g., 'Dashboard', 'My Tasks') */
    title?: string; // made optional so you don't have to pass it for back-only headers
    /** Optional handler for the Notification Bell icon */
    onNotificationPress?: () => void;
    /** Optional handler for the Settings Cog icon */
    onSettingsPress?: () => void;
    /** Boolean to control if the title should be displayed. (e.g., set to false for the Dashboard screen) */
    showTitle?: boolean;

    /** Show a back arrow instead of the notification + settings icons */
    showBack?: boolean;
    /** Handler for the back arrow press */
    onBackPress?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    title,
    onNotificationPress,
    onSettingsPress,
    showTitle = true,
    showBack = false,
    onBackPress,
}) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { showNotifications } = useNotificationModal();

    const barColor = theme.border;
    const contentColor = theme.background;

    const handleLeftPress = () => {
        if (showBack) {
            if (onBackPress) {
                onBackPress();
            }
            return;
        }

        // default: notifications behavior
        if (onNotificationPress) {
            onNotificationPress();
        } else {
            showNotifications();
        }
    };

    return (
        <View
            style={[
                styles.headerBar,
                {
                    backgroundColor: barColor,
                    paddingTop: insets.top + 5,
                },
            ]}
        >
            {/* LEFT: back arrow OR notification bell */}
            <TouchableOpacity
                style={styles.iconButton}
                onPress={handleLeftPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                {showBack ? (
                    <Ionicons name="arrow-back" size={28} color={contentColor} />
                ) : (
                    <Ionicons name="notifications-outline" size={28} color={contentColor} />
                )}
            </TouchableOpacity>

            {/* CENTER TITLE */}
            {showTitle && !!title && (
                <Text style={[styles.screenTitle, { color: contentColor }]}>
                    {title}
                </Text>
            )}

            {/* RIGHT: settings icon OR spacer (to keep layout symmetric in back mode) */}
            {showBack ? (
                <View style={styles.iconButton} />
            ) : (
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onSettingsPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="settings-outline" size={28} color={contentColor} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: width * 0.05,
        paddingBottom: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        width: '100%',
        zIndex: 10,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        bottom: 15,
    },
    iconButton: {
        padding: 5,
    },
});
