import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export type Theme = {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  border: string;
  inputBackground: string;
  cardBackground: string;
  secondaryText: string;
  commentsToggleOn: string;
  commentsToggleOff: string;
  onBackground: string;
  error: string;
  modalBorder: string;
  buttonText: string;
};

export const Colors = {
  lilac: {
    archiveAllText: '#6c63a2', // purple for lilac theme
    buttonText: '#fff',
    modalBorder: '#fff',
    commentsToggleBackgroundOn: '#d8d4f2',
    commentsToggleBackgroundOff: '#6c63a2',
    commentsToggleOn: '#fff',
    commentsToggleOff: '#000',
    text: '#6c63a2', // black text (applies to all text elements using theme.text)
    background: '#fff', // white background
    primary: '#d8d4f2', // lilac for containers/buttons
    border: '#d8d4f2', // lilac border
    inputBackground: '#f3f1fa', // lighter lilac for inputs
    cardBackground: '#f3f1fa', // lighter lilac for cards
    secondaryText: '#6c63a2', // muted lilac for secondary text
    tint: '#d8d4f2',
    icon: '#6c63a2',
    tabIconDefault: '#6c63a2',
    tabIconSelected: '#d8d4f2',
    onPrimary: '#fff',
    onBackground: '#6c63a2',
    error: '#ff4d4f',
    onError: '#fff',
    shadow: 'rgba(108,99,162,0.15)',
  },
  light: {
    onBackground: '#11181C', // black for light theme
    archiveAllText: '#000',
    buttonText: '#fff',
    modalBorder: '#fff',
    commentsToggleBackgroundOn: '#bdbdbd',
    commentsToggleBackgroundOff: '#505050ff',
    commentsToggleOn: '#fff',
    commentsToggleOff: '#000',
    text: '#11181C',
    background: '#fff',
    primary: "#cecdcdff",
    secondary: "#dcddddff",
    border: "#999999",
    inputBackground: "#F0F0F0",
    cardBackground: "#cecdcdff", // Added to match inputBackground
    secondaryText: '#687076',  // Added to match text2
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    onPrimary: '#fff',
    error: '#ff4d4f',
    onError: '#fff',
    // removed duplicate onBackground
    shadow: 'rgba(0,0,0,0.25)',
  },
  dark: {
    onBackground: '#fff', // white for dark theme
    archiveAllText: '#fff',
    buttonText: '#000',
    modalBorder: '#000',
    commentsToggleBackgroundOn: '#888',
    commentsToggleBackgroundOff: '#000',
    commentsToggleOn: '#fff',
    commentsToggleOff: '#000',
    text: '#fff',
    background: '#151718',
    primary: "#E0E0E0",
    secondary: "#9BA1A6",
    border: "#E0E0E0",
    inputBackground: "#121212",
    cardBackground: '#E0E0E0', // Placeholder for general dark card background
    secondaryText: '#9BA1A6',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    // removed duplicate onBackground
    tabIconSelected: tintColorDark,
    onPrimary: '#151718',
    error: '#ff4d4f',
    onError: '#fff',
    shadow: 'rgba(0,0,0,0.6)',
  },
  blue: {
    onBackground: '#32617D', // dark blue for blue theme
    archiveAllText: '#fff', // secondaryText for blue theme
    buttonText: '#ffffffff',
    modalBorder: '#1D3B53',
    commentsToggleBackgroundOn: '#6592acff',
    commentsToggleBackgroundOff: '#1D3B53',
    commentsToggleOn: '#fff',
    commentsToggleOff: '#000',

    // Main dark blue background color
    background: '#1D3B53',

    // Text/Icon color for the darkest background (white/off-white)
    text: '#F0F5F9',

    // The bright blue/light color used for the dashboard and cards (Light Blue/Gray)
    border: '#AECDD9',

    // removed duplicate onBackground
    // The color used for the main accent/progress bars (Darker Blue)
    primary: "#32617D",

    secondary: '#32617D',

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
    onPrimary: '#32617D',
    error: '#ff4d4f',
    onError: '#fff',
    shadow: 'rgba(0,0,0,0.4)',
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
    onBackground: '#fff',
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
