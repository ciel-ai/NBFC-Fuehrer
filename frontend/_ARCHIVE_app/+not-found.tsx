import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';

export default function NotFound() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingDone = useUserStore((s) => s.onboardingDone);

  if (isAuthenticated && onboardingDone) {
    return <Redirect href="/(main)/(tabs)/home" />;
  }
  if (isAuthenticated) {
    return <Redirect href="/(auth)/set-mpin" />;
  }
  return <Redirect href="/(public)" />;
}
