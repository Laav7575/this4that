import { Tabs } from 'expo-router';
import { theme } from '../../constants/theme';
import { AddPostButton, navigationStyle, primaryTabs, TabIcon } from '../../components/navigation/PrimaryNavigation';
export default function TabLayout() {
  return <Tabs screenOptions={{
    tabBarActiveTintColor: navigationStyle.active, tabBarInactiveTintColor: navigationStyle.inactive,
    tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, minHeight: navigationStyle.barHeight },
    tabBarLabelStyle: theme.typography.caption, tabBarLabelPosition: 'below-icon',
    headerTintColor: theme.colors.text, headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: theme.typography.heading, headerRight: () => <AddPostButton />,
  }}>
    {primaryTabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{
      title: tab.label, tabBarLabel: tab.label, tabBarIcon: ({ focused }) => <TabIcon name={tab.name} color={focused ? navigationStyle.active : navigationStyle.inactive} />,
    }} />)}
    <Tabs.Screen name="search" options={{ href: null }} />
  </Tabs>;
}
