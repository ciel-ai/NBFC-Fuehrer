import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontSize } from '@/src/core/theme/typography';
import { scale } from '@/src/core/utils/responsive';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  iconOutline: IoniconName;
}

const TABS: TabConfig[] = [
  { name: 'home', title: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'loans', title: 'Loans', icon: 'documents', iconOutline: 'documents-outline' },
  { name: 'cards', title: 'Cards', icon: 'card', iconOutline: 'card-outline' },
  { name: 'profile', title: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
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
    </Tabs>
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
