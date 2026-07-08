import { Stack } from 'expo-router';

// (public) group: marketing/landing screens only.
// Auth screens (login, verify-otp) live in (auth)/.
export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    />
  );
}
