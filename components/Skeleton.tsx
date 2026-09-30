import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native';

// Loading placeholder that pulses, so it reads as "loading" instead of a frozen gray box
export default function Skeleton({
    width,
    height,
    color,
    style,
}: {
    width: DimensionValue;
    height: number;
    color: string;
    style?: StyleProp<ViewStyle>;
}) {
    const opacity = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [opacity]);

    return <Animated.View style={[{ width, height, borderRadius: 6, backgroundColor: color, opacity }, style]} />;
}
