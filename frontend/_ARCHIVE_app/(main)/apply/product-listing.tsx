import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { scale } from '@/src/core/utils/responsive';

interface Product {
  id: string;
  name: string;
  brand: string;
  mrp: number;
  loanAmount: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  image?: ImageSourcePropType;
}

const PRODUCTS_BY_CATEGORY: Record<string, Product[]> = {
  mobile: [
    // NOTE: product thumbnails fall back to the branded Ionicons below. Do NOT add
    // remote `image: { uri }` URLs here — they break offline and risk trademark
    // issues at review. Bundle local require() assets if real photos are needed.
    { id: 'm1', name: 'iPhone 15', brand: 'Apple', mrp: 79900, loanAmount: 75000, icon: 'phone-portrait', iconColor: Colors.primary, iconBg: Colors.primaryLight },
    { id: 'm2', name: 'Galaxy S24', brand: 'Samsung', mrp: 74999, loanAmount: 70000, icon: 'phone-portrait', iconColor: '#1a73e8', iconBg: '#E8F0FE' },
    { id: 'm3', name: 'Pixel 8', brand: 'Google', mrp: 59999, loanAmount: 55000, icon: 'phone-portrait', iconColor: '#34A853', iconBg: '#E6F4EA' },
    { id: 'm4', name: 'OnePlus 12', brand: 'OnePlus', mrp: 64999, loanAmount: 60000, icon: 'phone-portrait', iconColor: '#DC2626', iconBg: '#FEE2E2' },
    { id: 'm5', name: 'Mi 14 Pro', brand: 'Xiaomi', mrp: 44999, loanAmount: 42000, icon: 'phone-portrait', iconColor: Colors.gold, iconBg: Colors.goldLight },
  ],
  home_appliance: [
    { id: 'a1', name: 'Front Load 7kg', brand: 'Bosch', mrp: 52990, loanAmount: 48000, icon: 'home', iconColor: '#0D9488', iconBg: '#CCFBF1' },
    { id: 'a2', name: 'Double Door 265L', brand: 'Whirlpool', mrp: 38990, loanAmount: 36000, icon: 'home', iconColor: '#7C3AED', iconBg: '#EDE9FE' },
  ],
  laptop: [
    { id: 'l1', name: 'MacBook Air M3', brand: 'Apple', mrp: 114900, loanAmount: 110000, icon: 'laptop', iconColor: Colors.primary, iconBg: Colors.primaryLight },
    { id: 'l2', name: 'XPS 15', brand: 'Dell', mrp: 139990, loanAmount: 130000, icon: 'laptop', iconColor: '#7C3AED', iconBg: '#EDE9FE' },
    { id: 'l3', name: 'IdeaPad Slim 5', brand: 'Lenovo', mrp: 64990, loanAmount: 60000, icon: 'laptop', iconColor: '#0D9488', iconBg: '#CCFBF1' },
  ],
};

const ALL_PRODUCTS = Object.values(PRODUCTS_BY_CATEGORY).flat();

function formatPrice(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

/** Product thumbnail: shows the photo, falling back to the icon if it fails. */
function ProductThumb({ item }: { item: Product }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.thumb, { backgroundColor: item.iconBg }]}>
      {item.image && !failed ? (
        <Image
          source={item.image}
          style={styles.thumbImg}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name={item.icon} size={scale(26)} color={item.iconColor} />
      )}
    </View>
  );
}

export default function ProductListingScreen() {
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();

  const [search, setSearch] = useState('');
  const products = categoryId
    ? PRODUCTS_BY_CATEGORY[categoryId] ?? ALL_PRODUCTS
    : ALL_PRODUCTS;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }, [products, search]);

  const navigateToProduct = (item: Product) => {
    router.push({
      pathname: '/(main)/apply/product-detail',
      params: {
        productId: item.id,
        productName: item.name,
        brand: item.brand,
        mrp: item.mrp.toString(),
        loanAmount: item.loanAmount.toString(),
        iconBg: item.iconBg,
        iconColor: item.iconColor,
        icon: item.icon,
      },
    });
  };

  const renderItem = ({ item }: { item: Product }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
      onPress={() => navigateToProduct(item)}
      android_ripple={{ color: `${Colors.primary}10`, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} by ${item.brand}, MRP ${formatPrice(item.mrp)}, loan up to ${formatPrice(item.loanAmount)}`}
    >
      <ProductThumb item={item} />

      <View style={styles.rowInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.brand}>{item.brand}</Text>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>MRP</Text>
            <Text style={styles.mrp}>{formatPrice(item.mrp)}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View>
            <Text style={styles.priceLabel}>Loan up to</Text>
            <Text style={styles.loanAmt}>{formatPrice(item.loanAmount)}</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}
        onPress={() => navigateToProduct(item)}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={`Apply for ${item.name}`}
      >
        <Text style={styles.applyBtnText}>Apply</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title={categoryName ?? 'All Products'} showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Search bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={scale(18)} color={Colors.textDisabled} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products or brands…"
              placeholderTextColor={Colors.textDisabled}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              accessibilityLabel="Search products"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={scale(18)} color={Colors.textDisabled} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.7 }]}
            android_ripple={{ color: `${Colors.primary}20`, borderless: false }}
            accessibilityRole="button"
            accessibilityLabel="Filter products"
          >
            <Ionicons name="options" size={scale(20)} color={Colors.primary} />
          </Pressable>
        </View>

        <Text style={styles.resultText}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
        </Text>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={scale(48)} color={Colors.border} />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },

  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: scale(44),
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    height: '100%',
  },
  filterBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  list: { padding: Spacing.xl, gap: Spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.medium,
  },
  thumb: {
    width: scale(60),
    height: scale(60),
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '82%',
    height: '82%',
  },
  rowInfo: { flex: 1 },
  productName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  brand: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  priceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textDisabled,
    marginBottom: 1,
  },
  mrp: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  priceDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  loanAmt: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  applyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
  },
  applyBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textWhite,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.textDisabled,
  },
});
