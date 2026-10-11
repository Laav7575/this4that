import { Placeholder } from '../../components/Placeholder';
import { currentUser } from '../../data/mockData';
export default function Route() { return <Placeholder title="My Profile" actions={[{ label: 'Open public profile', href: { pathname: '/user/[id]', params: { id: currentUser.id } } }, { label: 'Return to Login', href: '/login' }]} />; }
