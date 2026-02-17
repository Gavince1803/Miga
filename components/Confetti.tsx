import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
    '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
    '#FF9F43', '#EE5A24', '#A29BFE', '#FD79A8',
    '#00CEC9', '#FDCB6E', '#E17055', '#74B9FF',
];

const NUM_CONFETTI = 60;

interface ConfettiPiece {
    x: Animated.Value;
    y: Animated.Value;
    rotation: Animated.Value;
    scale: Animated.Value;
    opacity: Animated.Value;
    color: string;
    size: number;
    isCircle: boolean;
}

interface ConfettiProps {
    active: boolean;
    duration?: number;
}

export default function Confetti({ active, duration = 3000 }: ConfettiProps) {
    const pieces = useRef<ConfettiPiece[]>([]);

    // Initialize confetti pieces
    if (pieces.current.length === 0) {
        pieces.current = Array.from({ length: NUM_CONFETTI }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            rotation: new Animated.Value(0),
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            size: Math.random() * 8 + 4,
            isCircle: Math.random() > 0.5,
        }));
    }

    useEffect(() => {
        if (!active) return;

        const animations = pieces.current.map((piece) => {
            // Random start position (spread from center-top)
            const startX = SCREEN_WIDTH * 0.2 + Math.random() * SCREEN_WIDTH * 0.6;
            const startY = -20;

            // Random end position (spread wide, fall down)
            const endX = startX + (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;
            const endY = SCREEN_HEIGHT + 50;

            // Random delay for staggered effect
            const delay = Math.random() * 800;

            // Reset
            piece.x.setValue(startX);
            piece.y.setValue(startY);
            piece.rotation.setValue(0);
            piece.scale.setValue(0);
            piece.opacity.setValue(1);

            return Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    // Fall down with slight wobble
                    Animated.timing(piece.y, {
                        toValue: endY,
                        duration: duration + Math.random() * 1500,
                        useNativeDriver: true,
                    }),
                    // Horizontal drift
                    Animated.timing(piece.x, {
                        toValue: endX,
                        duration: duration + Math.random() * 1500,
                        useNativeDriver: true,
                    }),
                    // Spin
                    Animated.timing(piece.rotation, {
                        toValue: Math.random() * 10 - 5,
                        duration: duration + 1000,
                        useNativeDriver: true,
                    }),
                    // Pop in
                    Animated.sequence([
                        Animated.spring(piece.scale, {
                            toValue: 1,
                            friction: 4,
                            tension: 60,
                            useNativeDriver: true,
                        }),
                    ]),
                    // Fade out at end
                    Animated.sequence([
                        Animated.delay(duration * 0.7),
                        Animated.timing(piece.opacity, {
                            toValue: 0,
                            duration: duration * 0.3,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]);
        });

        Animated.parallel(animations).start();
    }, [active, duration]);

    if (!active) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.current.map((piece, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.confetti,
                        {
                            width: piece.size,
                            height: piece.isCircle ? piece.size : piece.size * 2.5,
                            backgroundColor: piece.color,
                            borderRadius: piece.isCircle ? piece.size / 2 : 2,
                            opacity: piece.opacity,
                            transform: [
                                { translateX: piece.x },
                                { translateY: piece.y },
                                {
                                    rotate: piece.rotation.interpolate({
                                        inputRange: [-5, 5],
                                        outputRange: ['-180deg', '180deg'],
                                    }),
                                },
                                { scale: piece.scale },
                            ],
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    confetti: {
        position: 'absolute',
    },
});
