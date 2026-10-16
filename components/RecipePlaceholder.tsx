import { Colors, Fonts } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Shown instead of a gray book icon when a recipe has no photo: the recipe's
// initial in serif on a brand tint, so a list without photos still looks intentional.
export default function RecipePlaceholder({
  title,
  colors,
  size,
}: {
  title: string;
  colors: typeof Colors.light;
  size: number;
}) {
  const initial = title.trim().charAt(0).toUpperCase() || '·';
  // Alternate gold / rose by title so neighboring cards don't all look the same
  const tint = title.length % 2 === 0 ? colors.primary : colors.secondary;

  return (
    <View style={[styles.container, { backgroundColor: tint + '30' }]}>
      <Text style={[styles.initial, { color: colors.primaryText, fontSize: size, lineHeight: size * 1.25 }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: Fonts.serif,
  },
});
