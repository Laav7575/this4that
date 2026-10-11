import { useLocalSearchParams } from 'expo-router';
import { Placeholder } from '../../components/Placeholder';
import { users } from '../../data/mockData';
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = users.find(item => item.id === id);
  return <Placeholder title="Public Profile" detail={item ? `Placeholder for ID: ${item.id}` : `No mock record for ID: ${id}`} />;
}
