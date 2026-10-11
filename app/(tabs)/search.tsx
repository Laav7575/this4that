import { Placeholder } from '../../components/Placeholder';
import { posts } from '../../data/mockData';
export default function Route() { return <Placeholder title="Search" actions={[{ label: 'Open sample result', href: { pathname: '/post/[id]', params: { id: posts[1].id } } }]} />; }
