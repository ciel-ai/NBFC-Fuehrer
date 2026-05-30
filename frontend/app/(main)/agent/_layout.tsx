import { Redirect, Stack } from 'expo-router';
import { useUserStore } from '@/src/store/userStore';

// Role guard for the agent section. A user explicitly in the customer role is
// redirected to the customer home; agents (and not-yet-hydrated sessions) pass.
export default function AgentLayout() {
  const isHydrated = useUserStore((s) => s.isHydrated);
  const role = useUserStore((s) => s.user?.role ?? s.role);

  if (isHydrated && role === 'customer') {
    return <Redirect href="/(main)/(tabs)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
