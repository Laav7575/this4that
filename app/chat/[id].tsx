import { useLocalSearchParams } from 'expo-router';
import { Placeholder } from '../../components/Placeholder';
import { conversations } from '../../data/mockData';
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = conversations.find(item => item.id === id);
  return <Placeholder title="Chat" detail={item ? `Placeholder for ID: ${item.id}` : `No mock record for ID: ${id}`} />;
}
