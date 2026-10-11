import { useLocalSearchParams } from 'expo-router';
import { Placeholder } from '../../components/Placeholder';
import { posts } from '../../data/mockData';
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = posts.find(item => item.id === id);
  return <Placeholder title="Post Details" detail={item ? `Placeholder for ID: ${item.id}` : `No mock record for ID: ${id}`} />;
}
