import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale } from '@/src/core/utils/responsive';

interface PromoItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  icon: keyof typeof Ionicons.glyphMap;
  cta: string;
  bgColor: string;
  accentColor: string;
  route: Parameters<typeof router.push>[0];
}

const PROMO_ITEMS: PromoItem[] = [
  {
    id: '1',
    title: '0% Interest on iPhone 15',
    subtitle: 'Own it today. No processing fee.',
    badge: 'LIMITED TIME',
    icon: 'phone-portrait',
    cta: 'Check Eligibility',
    bgColor: Colors.primary,
    accentColor: '#FFFFFF',
    route: '/(main)/apply/consumer-durable',
  },
  {
    id: '2',
    title: 'Home Loan @ 8.40% p.a.',
    subtitle: 'PMAY subsidy up to ₹2.67 Lakh',
    badge: 'GOVT SCHEME',
    icon: 'home',
    cta: 'Apply Now',
    bgColor: Colors.navy,
    accentColor: '#FCD34D',
    route: '/(main)/apply/affordable-housing',
  },
  {
    id: '3',
    title: 'Gold Loan @ 0.88%/month',
    subtitle: 'Instant cash against gold. 30-min branch appraisal.',
    badge: 'INSTANT DISBURSAL',
    icon: 'diamond',
    cta: 'Apply Now',
    bgColor: Colors.goldDark,
    accentColor: '#FFFFFF',
    route: '/(main)/apply/gold-loan',
  },
];

const AUTOPLAY_MS = 4500;
const RESUME_AFTER_INTERACTION_MS = 6000;
const CAROUSEL_SIDE_PADDING = scale(20);
const CARD_GAP = scale(12);

function PaginationDot({ active, color }: { active: boolean; color: string }) {
  const width = useSharedValue(active ? 20 : 6);
  const opacity = useSharedValue(active ? 1 : 0.4);

  useEffect(() => {
    width.value = withSpring(active ? 20 : 6, { damping: 15, stiffness: 200 });
    opacity.value = withSpring(active ? 1 : 0.4, { damping: 15, stiffness: 200 });
  }, [active, width, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle, { backgroundColor: color }]} />;
}

function PromoCard({ item, width }: { item: PromoItem; width: number }) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(item.route);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: item.bgColor, width },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.subtitle}. ${item.cta}`}
    >
      {/* Decorative depth overlay — top-right radial */}
      <View style={[styles.decorCircleLg, { backgroundColor: item.accentColor }]} pointerEvents="none" />
      <View style={[styles.decorCircleSm, { backgroundColor: item.accentColor }]} pointerEvents="none" />

      <View style={styles.cardInner}>
        {item.badge && (
          <View style={styles.badge}>
            <View style={styles.badgePulse} />
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.textContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>

            <View style={styles.ctaChip}>
              <Text style={styles.ctaText}>{item.cta}</Text>
              <Ionicons name="arrow-forward" size={scale(13)} color={Colors.textWhite} />
            </View>
          </View>

          <View style={styles.iconBg}>
            <Ionicons name={item.icon} size={scale(32)} color={Colors.textWhite} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function PromoCarousel() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - CAROUSEL_SIDE_PADDING * 2;
  const snapInterval = cardWidth + CARD_GAP;

  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    clearTimers();
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % PROMO_ITEMS.length;
        scrollRef.current?.scrollTo({ x: next * snapInterval, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
  }, [clearTimers, snapInterval]);

  const pauseAutoplay = useCallback(() => {
    clearTimers();
    resumeTimeoutRef.current = setTimeout(startAutoplay, RESUME_AFTER_INTERACTION_MS);
  }, [clearTimers, startAutoplay]);

  useEffect(() => {
    startAutoplay();
    return clearTimers;
  }, [startAutoplay, clearTimers]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScrollBeginDrag={pauseAutoplay}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {PROMO_ITEMS.map((item, i) => (
          <View key={item.id} style={{ marginRight: i === PROMO_ITEMS.length - 1 ? 0 : CARD_GAP }}>
            <PromoCard item={item} width={cardWidth} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {PROMO_ITEMS.map((_, index) => (
          <PaginationDot
            key={index}
            active={index === activeIndex}
            color={index === activeIndex ? PROMO_ITEMS[activeIndex].bgColor : Colors.border}
          />
        ))}
      </View>
    </View>
  );
}

const CARD_MIN_H = scale(168);

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  scrollContent: { paddingHorizontal: CAROUSEL_SIDE_PADDING },

  card: {
    borderRadius: BorderRadius.xl,
    height: CARD_MIN_H,
    overflow: 'hidden',
    ...Shadow.medium,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

  /* Decorative depth — large faded circle top-right + small one bottom-left */
  decorCircleLg: {
    position: 'absolute',
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
    top: -scale(70),
    right: -scale(50),
    opacity: 0.08,
  },
  decorCircleSm: {
    position: 'absolute',
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    bottom: -scale(30),
    left: -scale(20),
    opacity: 0.06,
  },

  cardInner: {
    padding: Spacing.md,
    flex: 1,
    justifyContent: 'space-between',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  badgePulse: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.textWhite,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.textWhite,
    letterSpacing: 0.6,
  },

  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  textContent: { flex: 1, gap: 4 },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: scale(17),
    color: Colors.textWhite,
    lineHeight: scale(22),
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.sm,
  },

  ctaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ctaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textWhite,
    letterSpacing: 0.2,
  },

  iconBg: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
