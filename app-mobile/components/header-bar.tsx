import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useNotificationModal } from '@/app/_layout';

const { width } = Dimensions.get('window');

interface HeaderBarProps {
    /** The title to display in the center of the header (e.g., 'Dashboard', 'My Tasks') */
    title: string;
    /** Optional handler for the Notification Bell icon */
    onNotificationPress?: () => void;
    /** Optional handler for the Settings Cog icon */
    onSettingsPress?: () => void;
    /** Boolean to control if the title should be displayed. (e.g., set to false for the Dashboard screen) */
    showTitle?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    title,
    onNotificationPress,
    onSettingsPress,
    showTitle = true,
}) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { showNotifications } = useNotificationModal();

    // The header uses the light background color from the blue or dark theme
    const barColor = theme.border;
    // The icons and text use the main dark color for contrast
    const contentColor = theme.background;

    return (
        <View
            style={[
                styles.headerBar,
                {
                    backgroundColor: barColor,
                    paddingTop: insets.top + 5,
                }
            ]}
        >
            <TouchableOpacity
                style={styles.iconButton}
                onPress={onNotificationPress || showNotifications}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="notifications-outline" size={28} color={contentColor} />
            </TouchableOpacity>

            {showTitle && (
                <Text style={[styles.screenTitle, { color: contentColor }]}>
                    {title}
                </Text>
            )}

            <TouchableOpacity
                style={styles.iconButton}
                onPress={onSettingsPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="settings-outline" size={28} color={contentColor} />
            </TouchableOpacity>
        </View>
    );
};

// --- STYLES ---

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
        // The height is dynamic due to paddingBottom/Top and insets
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        // Ensures the title doesn't push the icons too far apart
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        bottom: 15, // Align with the bottom padding
    },
    iconButton: {
        padding: 5,
    },
});