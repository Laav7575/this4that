import { Tabs, router } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, Text } from 'react-native';
import { theme } from '../../constants/theme';
const icons = {
  home: require('../../assets/icons/home.svg'),
  messages: require('../../assets/icons/messages.svg'), profile: require('../../assets/icons/profile.svg'),
};
export default function TabLayout() {
  return <Tabs screenOptions={{
    tabBarActiveTintColor: theme.colors.secondary, tabBarInactiveTintColor: theme.colors.text,
    tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, minHeight: theme.dimensions.tabBar },
    tabBarLabelStyle: theme.typography.caption, headerTintColor: theme.colors.text,
    headerStyle: { backgroundColor: theme.colors.surface }, headerTitleStyle: theme.typography.heading,
    headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="New Post" onPress={() => router.push('/post/new')}
      style={{ minWidth: theme.dimensions.touchTarget, minHeight: theme.dimensions.touchTarget, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.colors.primary, fontSize: 28 }}>+</Text></Pressable>,
  }}>
    {(Object.keys(icons) as (keyof typeof icons)[]).map(name => <Tabs.Screen key={name} name={name} options={{
      title: name === 'profile' ? 'My Profile' : name[0].toUpperCase() + name.slice(1),
      tabBarIcon: ({ focused }) => <Image source={icons[name]} contentFit="contain" style={{ width: 24, height: 24,
        tintColor: focused ? theme.colors.secondary : theme.colors.text }} />,
    }} />)}
    <Tabs.Screen name="search" options={{ href: null }} />
  </Tabs>;
}
