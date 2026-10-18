import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMockProfileStats } from '../../data/mockProfileStats';
import {
  isUuid,
  loadProfileBundle,
  type ProfileWithMeta,
} from '../../services/profileData';
import type { PostRow } from '../../types/database';

export type ProfileState =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      profile: ProfileWithMeta;
      posts: PostRow[];
      stats: ReturnType<typeof getMockProfileStats>;
    };

export function useProfile(id: string | undefined) {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const load = useCallback(async () => {
    if (!isUuid(id)) {
      setState({ status: 'notfound' });
      return;
    }
    try {
      const { profile, posts } = await loadProfileBundle(id);
      setState(
        profile
          ? { status: 'ready', profile, posts, stats: getMockProfileStats(id) }
          : { status: 'notfound' },
      );
    } catch (e) {
      setState({
        status: 'error',
        message:
          e instanceof Error ? e.message : 'Could not load this profile.',
      });
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return {
    state,
    reload: () => {
      setState({ status: 'loading' });
      void load();
    },
  };
}