import { router, type Href } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from './Screen';
import { Button, Card } from './ui';
import { theme } from '../constants/theme';
export function Placeholder({ title, detail, actions = [] }: {
  title: string; detail?: string; actions?: { label: string; href: Href }[];
}) {
  return <Screen><Text accessibilityRole="header" style={[theme.typography.heading, { color: theme.colors.text }]}>{title}</Text>
    <Card><Text style={[theme.typography.body, { color: theme.colors.body }]}>{detail ?? 'Feature implementation belongs to the assigned screen developer.'}</Text></Card>
    {actions.map(action => <Button key={action.label} label={action.label} variant="secondary" onPress={() => router.push(action.href)} />)}
    <Button label="Back to Home" onPress={() => router.replace('/home')} />
  </Screen>;
}
