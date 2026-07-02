import { Redirect } from 'expo-router';

// The public landing/consent screen now lives at (auth)/landing, which presents
// the welcome screen and the "Before you continue" consent popup in one place.
// This route is kept only as a stable fallback target (logout, +not-found,
// deep-link initial route) and immediately forwards to it.
export default function PublicIndex() {
  return <Redirect href="/(auth)/landing" />;
}
