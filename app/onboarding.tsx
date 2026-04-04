import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_KEY = 'miga_onboarding_completed';

type Slide = {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    features?: { icon: string; text: string }[];
};

export async function markOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export default function OnboardingScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    const slides: Slide[] = [
        {
            id: 'welcome',
            icon: (
                <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.heroImage}
                    resizeMode="cover"
                />
            ),
            title: 'Bienvenida a Miga',
            subtitle: 'Tu asistente personal para gestionar pedidos, inventario y finanzas de tu repostería — todo en un solo lugar.',
        },
        {
            id: 'reminders',
            icon: null,
            title: 'Nunca más olvides\nuna entrega',
            subtitle: 'Miga te avisa automáticamente antes de cada pedido. Di adiós a las notas de papel y los recordatorios mentales.',
            features: [
                { icon: 'bell', text: 'Recordatorios automáticos por pedido' },
                { icon: 'calendar', text: 'Vista de calendario con urgencia visual' },
                { icon: 'check-circle', text: 'Estado de cada pedido al instante' },
            ],
        },
        {
            id: 'cta',
            icon: null,
            title: '¡Todo listo para\nempezar!',
            subtitle: 'Crea tu primer pedido y experimenta cómo Miga organiza tu negocio con el cuidado que merece.',
        },
    ];

    const handleNext = async () => {
        if (activeIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
        }
    };

    const handleCreateOrder = async () => {
        await markOnboardingComplete();
        router.replace('/(tabs)');
        router.push('/orders/new' as any);
    };

    const handleSkip = async () => {
        await markOnboardingComplete();
        router.replace('/(tabs)');
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const isLast = activeIndex === slides.length - 1;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Skip button */}
            {!isLast && (
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={[styles.skipText, { color: colors.textMuted }]}>Omitir</Text>
                </TouchableOpacity>
            )}

            {/* Slides */}
            <Animated.FlatList
                ref={flatListRef}
                data={slides}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                renderItem={({ item, index }) => (
                    <SlideItem
                        item={item}
                        index={index}
                        colors={colors}
                        scrollX={scrollX}
                    />
                )}
            />

            {/* Bottom controls */}
            <View style={styles.controls}>
                {/* Dots */}
                <View style={styles.dots}>
                    {slides.map((_, i) => {
                        const inputRange = [
                            (i - 1) * SCREEN_WIDTH,
                            i * SCREEN_WIDTH,
                            (i + 1) * SCREEN_WIDTH,
                        ];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.35, 1, 0.35],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity,
                                        backgroundColor: colors.primary,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Action button */}
                {isLast ? (
                    <View style={styles.ctaGroup}>
                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                {
                                    backgroundColor: colors.primary,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.35,
                                    shadowRadius: 8,
                                    elevation: 6,
                                },
                            ]}
                            onPress={handleCreateOrder}
                        >
                            <FontAwesome name="plus-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryButtonText}>Crear mi primer pedido</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
                            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                                Explorar la app primero
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            {
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.35,
                                shadowRadius: 8,
                                elevation: 6,
                            },
                        ]}
                        onPress={handleNext}
                    >
                        <Text style={styles.primaryButtonText}>Siguiente</Text>
                        <FontAwesome name="arrow-right" size={14} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

type SlideItemProps = {
    item: Slide;
    index: number;
    colors: typeof Colors.light;
    scrollX: Animated.Value;
};

function SlideItem({ item, index, colors, scrollX }: SlideItemProps) {
    const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
    ];

    const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [40, 0, 40],
        extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
    });

    // Slide-specific icon/illustration
    let illustration: React.ReactNode;

    if (item.id === 'welcome') {
        illustration = (
            <View style={styles.heroImageWrapper}>
                <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.heroImage}
                    resizeMode="cover"
                />
            </View>
        );
    } else if (item.id === 'reminders') {
        illustration = (
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary + '30' }]}>
                <View style={[styles.iconCircleInner, { backgroundColor: colors.secondary + '60' }]}>
                    <FontAwesome name="bell" size={52} color={colors.secondary} />
                </View>
            </View>
        );
    } else {
        illustration = (
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '25' }]}>
                <View style={[styles.iconCircleInner, { backgroundColor: colors.primary + '50' }]}>
                    <FontAwesome name="star" size={52} color={colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.slide]}>
            <Animated.View style={[styles.slideContent, { opacity, transform: [{ translateY }] }]}>
                {/* Illustration */}
                <View style={styles.illustrationArea}>
                    {illustration}
                </View>

                {/* Text */}
                <View style={styles.textArea}>
                    <Text style={[styles.slideTitle, { color: colors.text }]}>
                        {item.title}
                    </Text>
                    <Text style={[styles.slideSubtitle, { color: colors.textSecondary }]}>
                        {item.subtitle}
                    </Text>
                </View>

                {/* Features (slide 2 only) */}
                {item.features && (
                    <View style={[styles.featuresCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                        {item.features.map((f, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.featureRow,
                                    i < item.features!.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                ]}
                            >
                                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                                    <FontAwesome name={f.icon as any} size={16} color={colors.primary} />
                                </View>
                                <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    skipBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 16,
        right: Spacing.lg,
        zIndex: 10,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    slideContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Spacing.xxl,
    },
    illustrationArea: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    heroImageWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    heroImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleInner: {
        width: 104,
        height: 104,
        borderRadius: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textArea: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.sm,
    },
    slideTitle: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: Spacing.md,
        lineHeight: 36,
    },
    slideSubtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        fontWeight: '400',
    },
    featuresCard: {
        width: '100%',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    controls: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.xl,
        paddingTop: Spacing.md,
        alignItems: 'center',
        gap: Spacing.md,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    dot: {
        height: 8,
        borderRadius: BorderRadius.full,
    },
    primaryButton: {
        height: 54,
        borderRadius: BorderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    ctaGroup: {
        width: '100%',
        gap: Spacing.sm,
    },
    secondaryButton: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
