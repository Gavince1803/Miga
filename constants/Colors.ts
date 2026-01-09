/**
 * Agenda Repostera - Design System Colors
 * Warm, bakery-inspired palette with Steve Jobs-like elegance
 */

import { Platform, ViewStyle } from 'react-native';

const tintColorLight = '#D4A574'; // Soft Gold - primary accent
const tintColorDark = '#E8B4B8'; // Warm Rose

export const Colors = {
  light: {
    // Base colors
    background: '#FDF8F3', // Cream/Ivory - like fresh dough
    surface: '#FFFFFF',
    surfaceSecondary: '#FAF5F0',

    // Text
    text: '#5D4037', // Rich Chocolate
    textSecondary: '#8D6E63',
    textMuted: '#A1887F',

    // Accents
    tint: tintColorLight,
    primary: '#D4A574', // Soft Gold
    secondary: '#E8B4B8', // Warm Rose

    // Status colors
    success: '#A8D5BA', // Mint Fresh
    warning: '#FFB74D', // Warm Orange
    error: '#E57373', // Urgent Red

    // Calendar urgency colors
    urgentToday: '#E57373', // Red - today/tomorrow
    urgentSoon: '#FFB74D', // Orange - 2-3 days
    urgentWeek: '#FFE082', // Yellow - this week  
    urgentFuture: '#A8D5BA', // Green - future

    // UI elements
    border: '#E8DDD4',
    tabIconDefault: '#A1887F',
    tabIconSelected: tintColorLight,
    icon: '#5D4037',
  },
  dark: {
    // Base colors
    background: '#1A1412',
    surface: '#2D2420',
    surfaceSecondary: '#3D322C',

    // Text
    text: '#F5EDE8',
    textSecondary: '#D7C4B8',
    textMuted: '#A18A7A',

    // Accents
    tint: tintColorDark,
    primary: '#E8B4B8', // Warm Rose for dark mode
    secondary: '#D4A574', // Soft Gold

    // Status colors
    success: '#81C784',
    warning: '#FFB74D',
    error: '#EF5350',

    // Calendar urgency colors
    urgentToday: '#EF5350',
    urgentSoon: '#FFB74D',
    urgentWeek: '#FFE082',
    urgentFuture: '#81C784',

    // UI elements
    border: '#4A3F38',
    tabIconDefault: '#A18A7A',
    tabIconSelected: tintColorDark,
    icon: '#F5EDE8',
  },
};

// Spacing system (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography
export const Typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

// Border radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows - Platform aware (web uses boxShadow, native uses shadow* props)

type ShadowStyle = ViewStyle;

const createShadow = (
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number
): ShadowStyle => {
  if (Platform.OS === 'web') {
    // Convert to web-compatible boxShadow
    const rgba = `rgba(93, 64, 55, ${opacity})`; // #5D4037 with opacity
    return {
      boxShadow: `0px ${offsetY}px ${radius}px ${rgba}`,
    } as ShadowStyle;
  }
  // Native shadow properties
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation,
  };
};

export const Shadows = {
  sm: createShadow('#5D4037', 1, 0.08, 2, 1),
  md: createShadow('#5D4037', 2, 0.1, 8, 3),
  lg: createShadow('#5D4037', 4, 0.12, 16, 5),
};

