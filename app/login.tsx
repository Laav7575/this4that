import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Avatar, Button, Card, Input } from '../components/ui';
import { theme } from '../constants/theme';
import { currentUser } from '../data/mockData';
export default function Login() {
  const [value, setValue] = useState('');
  return <Screen><Text accessibilityRole="header" style={[theme.typography.heading, { color: theme.colors.text }]}>This4That · Login</Text>
    <Card><Avatar name={currentUser.name} /><Text style={theme.typography.body}>Foundation preview. Continue without authentication.</Text>
      <Input label="Component preview" placeholder="Try the shared input" value={value} onChangeText={setValue} />
      <Button label="Continue to Home" onPress={() => router.replace('/home')} />
      <Button label="Disabled button" disabled variant="secondary" />
    </Card></Screen>;
}
