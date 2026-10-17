/**
 * Demo mode: set EXPO_PUBLIC_DEMO_MODE=1 in .env (then restart Expo) to skip sign-in and use
 * in-memory sample data instead of Supabase. Nothing is saved; reloading resets it. Never enable in a real build.
 */
export const DEMO = process.env.EXPO_PUBLIC_DEMO_MODE === '1';
export const DEMO_USER_ID = 'demo-me';
