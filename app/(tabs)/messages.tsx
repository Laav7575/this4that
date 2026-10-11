import { Placeholder } from '../../components/Placeholder';
import { conversations } from '../../data/mockData';
export default function Route() { return <Placeholder title="Messages" actions={[{ label: 'Open sample chat', href: { pathname: '/chat/[id]', params: { id: conversations[0].id } } }]} />; }
