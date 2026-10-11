import { Placeholder } from '../../components/Placeholder';
import { posts } from '../../data/mockData';
export default function Route() { return <Placeholder title="Home" actions={[{ label: 'Open sample post', href: { pathname: '/post/[id]', params: { id: posts[0].id } } }, { label: 'New Post', href: '/post/new' }]} />; }
