import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export type Theme = {
  background: string;
  text: string;
  primary: string;
  border: string;
  inputBackground: string;
  cardBackground: string;
  secondaryText: string;
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    primary: "#999999",
    border: "#999999",
    inputBackground: "#F0F0F0",
    cardBackground: "#F0F0F0", // Added to match inputBackground
    secondaryText: '#687076',  // Added to match text2
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    primary: "#E0E0E0",
    border: "#E0E0E0",
    inputBackground: "#121212",
    cardBackground: '#1E1E1E', // Placeholder for general dark card background
    secondaryText: '#9BA1A6',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  blue: {

    // Main dark blue background color
    background: '#1D3B53',

    // Text/Icon color for the darkest background (white/off-white)
    text: '#F0F5F9',

    // The bright blue/light color used for the dashboard and cards (Light Blue/Gray)
    border: '#AECDD9',

    // The color used for the main accent/progress bars (Darker Blue)
    primary: "#32617D",

    // Background for inputs or secondary containers
    inputBackground: "#173045",

    // Explicit color for card backgrounds, matching 'border' for the light blue boxes
    cardBackground: '#AECDD9',

    // Secondary text color for time stamps, etc.
    secondaryText: '#32617D',

    tint: tintColorDark,
    icon: '#F0F5F9',
    tabIconDefault: '#BFC8D1',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
