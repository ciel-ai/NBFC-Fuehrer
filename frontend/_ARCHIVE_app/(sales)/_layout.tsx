import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontSize } from '@/src/core/theme/typography';
import { scale } from '@/src/core/utils/responsive';
import { useOfflineFlush } from '@/src/features/sales/hooks/useOfflineFlush';
import { useAuthGuard } from '@/src/shared/hooks/useAuthGuard';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  iconOutline: IoniconName;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Dashboard', icon: 'grid', iconOutline: 'grid-outline' },
  { name: 'history', title: 'History', icon: 'time', iconOutline: 'time-outline' },
];

function SalesSyncBridge() {
  useOfflineFlush();
  return null;
}

export default function SalesLayout() {
  const insets = useSafeAreaInsets();
  // Block customers (and unauthenticated users) from the entire sales group.
  const authorized = useAuthGuard(['sales_cdl', 'sales_gold', 'sales_housing']);

  if (!authorized) return null;

  return (
    <>
      <SalesSyncBridge />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.tabBarActive,
          tabBarInactiveTintColor: Colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            ...Typography.tiny,
            fontSize: FontSize.xs,
          },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ focused, color }) => (
                <View style={styles.iconStack}>
                  <Ionicons
                    name={focused ? tab.icon : tab.iconOutline}
                    size={scale(22)}
                    color={color}
                  />
                  <View style={[styles.activeDot, focused && styles.activeDotVisible]} />
                </View>
              ),
            }}
          />
        ))}
        <Tabs.Screen name="new-sale" options={{ href: null }} />
        <Tabs.Screen name="review" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  iconStack: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(30),
  },
  activeDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    marginTop: scale(3),
    backgroundColor: 'transparent',
  },
  activeDotVisible: {
    backgroundColor: Colors.tabBarActive,
  },
});
