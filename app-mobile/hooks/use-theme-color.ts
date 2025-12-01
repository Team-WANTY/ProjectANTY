/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  // Prefer the app ThemeContext (user-selected theme). Fallback to system scheme.
  const appTheme = useTheme();
  if (appTheme && appTheme.theme && (appTheme.theme as any)[colorName]) {
    return (appTheme.theme as any)[colorName];
  }

  const scheme = useColorScheme() ?? 'light';
  const colorFromProps = props[scheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[scheme][colorName];
  }
}
