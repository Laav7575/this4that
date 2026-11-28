import { useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { Screen } from '../../components/Screen';
import { Button, Card, Input } from '../../components/ui';
import { theme } from '../../constants/theme';
import { createPost, getPost, updatePost } from '../../services/backend';
import { getMyUserId } from '../../services/profileData';
import type { PostInput, PostRow } from '../../types/database';

const categories = ['Academic', 'Technology', 'Errands', 'Household', 'Pets', 'Creative', 'Other'];

type Fields = Omit<PostInput, 'type'>;
const POST_TITLE_MAX_LENGTH = 80;
const POST_AVAILABILITY_MAX_LENGTH = 60;
const POST_LOCATION_MAX_LENGTH = 60;

const initialFields: Fields = {
	title: '',
	description: '',
	category: '',
	availability: '',
	location: '',
};

function CharacterCount({ value, limit }: { value: string; limit: number }) {
	const atLimit = value.length >= limit;
	return (
		<Text
			accessibilityLiveRegion="polite"
			style={[styles.characterCount, atLimit && styles.characterCountWarning]}
		>
			{value.length} / {limit} characters{atLimit ? ' · Character limit reached' : ''}
		</Text>
	);
}

export default function NewPost() {
	const { postId: routePostId } = useLocalSearchParams<{ postId?: string | string[] }>();
	const postId = Array.isArray(routePostId) ? routePostId[0] : routePostId;
	return <>
		<Stack.Screen options={{ title: postId ? 'Edit Post' : 'New Post' }} />
		<PostForm key={postId ?? 'new'} postId={postId} />
	</>;
}

function PostForm({ postId }: { postId?: string }) {
	const posthog = usePostHog();
	const [type, setType] = useState<PostInput['type']>('Request');
	const [fields, setFields] = useState<Fields>(initialFields);
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [createdPost, setCreatedPost] = useState<PostRow>();
	const [editStatus, setEditStatus] = useState<'loading' | 'ready' | 'missing' | 'forbidden' | 'error'>(postId ? 'loading' : 'ready');
	const [editError, setEditError] = useState('');

	useEffect(() => {
		let active = true;
		if (!postId) return () => { active = false; };

		const loadPost = async () => {
			try {
				const [post, myId] = await Promise.all([getPost(postId), getMyUserId()]);
				if (!active) return;
				if (!post) {
					setEditStatus('missing');
					return;
				}
				if (post.author_id !== myId) {
					setEditStatus('forbidden');
					return;
				}
				setType(post.type);
				setFields({
					title: post.title,
					description: post.description,
					category: post.category,
					availability: post.availability,
					location: post.location,
				});
				setEditStatus('ready');
			} catch (cause) {
				if (active) {
					setEditError(cause instanceof Error ? cause.message : 'Could not load this post.');
					setEditStatus('error');
				}
			}
		};
		void loadPost();
		return () => { active = false; };
	}, [postId]);

	const validation = {
		title: !fields.title.trim() ? 'Enter a title.' : fields.title.trim().length > POST_TITLE_MAX_LENGTH ? `Use ${POST_TITLE_MAX_LENGTH} characters or fewer.` : undefined,
		description: !fields.description.trim() ? 'Enter a description.' : fields.description.trim().length > 500 ? 'Use 500 characters or fewer.' : undefined,
		category: !fields.category.trim() || fields.category === 'Other' ? 'Select or enter a category.' : undefined,
		availability: fields.availability.length > POST_AVAILABILITY_MAX_LENGTH ? `Use ${POST_AVAILABILITY_MAX_LENGTH} characters or fewer.` : undefined,
		location: fields.location.length > POST_LOCATION_MAX_LENGTH ? `Use ${POST_LOCATION_MAX_LENGTH} characters or fewer.` : undefined,
	};

	const update = (key: keyof Fields, value: string) => {
		setFields(current => ({ ...current, [key]: value }));
	};

	const publish = async () => {
		setSubmitted(true);
		setError('');
		if (Object.values(validation).some(Boolean)) return;

		setLoading(true);
		try {
			const input: PostInput = {
				...fields,
				title: fields.title.trim(),
				description: fields.description.trim(),
				category: fields.category.trim(),
				availability: fields.availability.trim(),
				location: fields.location.trim(),
				type,
			};
			if (postId) {
				await updatePost(postId, input);
				router.back();
			} else {
				const post = await createPost(input);
				posthog.capture('post_created', {
					post_type: type,
					category: input.category,
					platform: Platform.OS,
				});
				setCreatedPost(post);
			}
		} catch (cause) {
			if (typeof cause === 'object' && cause && 'code' in cause && cause.code === 'P4060') {
				setError('Revise the language in your post and try again.');
			} else {
				setError(cause instanceof Error ? cause.message : `Could not ${postId ? 'save your changes' : 'publish your post'}. Try again.`);
			}
		} finally {
			setLoading(false);
		}
	};

	if (postId && editStatus !== 'ready') {
		return (
			<Screen>
				{editStatus === 'loading' ? (
					<ActivityIndicator accessibilityLabel="Loading post for editing" />
				) : (
					<>
						<Text accessibilityRole="header" style={styles.heading}>
							{editStatus === 'missing' ? 'Post not found' : editStatus === 'forbidden' ? 'You can’t edit this post' : 'Unable to load post'}
						</Text>
						<Text accessibilityRole={editStatus === 'error' ? 'alert' : undefined} style={styles.body}>
							{editStatus === 'missing'
								? 'This listing may have been removed or is no longer available.'
								: editStatus === 'forbidden'
									? 'Only the person who created this post can edit it.'
									: editError || 'Could not load this post. Please go back and try again.'}
						</Text>
						<Button label="Go back" onPress={() => router.back()} />
					</>
				)}
			</Screen>
		);
	}

	if (createdPost) {
		return (
			<Screen>
				<View style={styles.success}>
					<View style={styles.checkmark}><Text style={styles.checkmarkText}>OK</Text></View>
					<Text accessibilityRole="header" style={styles.heading}>
						Your {type.toLowerCase()} is live!
					</Text>
					<Text style={styles.supporting}>
						Your post is now visible to nearby students.
					</Text>
				</View>

				<Card>
					<View style={styles.postMeta}>
						<Text style={[styles.badge, type === 'Offer' ? styles.offerBadge : styles.requestBadge]}>
							{type === 'Offer' ? 'Offering' : 'Requesting'}
						</Text>
						<Text style={styles.live}>LIVE NOW</Text>
					</View>
					<Text style={styles.postTitle}>{createdPost.title}</Text>
					<Text style={styles.body}>{createdPost.description}</Text>
					<View style={styles.rule} />
					{createdPost.availability ? (
						<>
							<Text style={styles.label}>TIMING</Text>
							<Text style={styles.body}>{createdPost.availability}</Text>
						</>
					) : null}
					{createdPost.location ? (
						<>
							<Text style={styles.label}>LOCATION</Text>
							<Text style={styles.body}>{createdPost.location}</Text>
						</>
					) : null}
				</Card>

				<View style={styles.notice}>
					  <Text style={styles.noticeText}>Your post appears in Search and other students&apos; Home feeds.</Text>
				</View>
				<Button
					label="View my post"
					onPress={() => router.replace({ pathname: '/post/[id]', params: { id: createdPost.id } })}
				/>
				<Button label="Return to posts" variant="secondary" onPress={() => router.replace('/home')} />
			</Screen>
		);
	}

	const categoryChoice = categories.includes(fields.category)
		? fields.category
		: fields.category ? 'Other' : '';
	const customCategory = categoryChoice === 'Other' && fields.category !== 'Other'
		? fields.category
		: '';

	return (
		<Screen>
			<Text accessibilityRole="header" style={styles.heading}>{postId ? 'Edit post' : 'New post'}</Text>

			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Post type (required)</Text>
				<View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Post type">
					{(['Offer', 'Request'] as const).map(option => {
						const selected = option === type;
						return (
							<Pressable
								key={option}
								accessibilityRole="radio"
								accessibilityState={{ selected }}
								onPress={() => setType(option)}
								style={[styles.segmentOption, selected && styles.segmentSelected]}
							>
								<Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option}</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<Input
				label="Title (required)"
				placeholder={type === 'Offer' ? 'What can you help with?' : 'What do you need help with?'}
				value={fields.title}
				onChangeText={value => update('title', value)}
				maxLength={POST_TITLE_MAX_LENGTH}
				error={submitted ? validation.title : undefined}
			/>
			<CharacterCount value={fields.title} limit={POST_TITLE_MAX_LENGTH} />
			<Input
				label="Description (required)"
				placeholder="Add useful details, what to bring, and how long it may take..."
				value={fields.description}
				onChangeText={value => update('description', value)}
				multiline
				numberOfLines={4}
				maxLength={500}
				textAlignVertical="top"
				style={styles.description}
				error={submitted ? validation.description : undefined}
			/>
			<CharacterCount value={fields.description} limit={500} />

			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Category (required)</Text>
				<View style={styles.categories}>
					{categories.map(category => {
						const selected = categoryChoice === category;
						return (
							<Pressable
								key={category}
								accessibilityRole="button"
								accessibilityState={{ selected }}
								onPress={() => update('category', category)}
								style={[styles.category, selected && styles.categorySelected]}
							>
								<Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category}</Text>
							</Pressable>
						);
					})}
				</View>
				{categoryChoice === 'Other' && (
					<Input
						label="Your category (required)"
						placeholder="Enter a category"
						value={customCategory}
						onChangeText={value => update('category', value)}
						error={submitted ? validation.category : undefined}
					/>
				)}
				{submitted && validation.category && categoryChoice !== 'Other' && <Text style={styles.error}>{validation.category}</Text>}
			</View>

			<Input
				label="Availability (optional)"
				placeholder="Add timing, e.g. Saturday, 1-4 PM"
				value={fields.availability}
				onChangeText={value => update('availability', value)}
				maxLength={POST_AVAILABILITY_MAX_LENGTH}
				error={submitted ? validation.availability : undefined}
			/>
			<CharacterCount value={fields.availability} limit={POST_AVAILABILITY_MAX_LENGTH} />
			<Input
				label="Location (optional)"
				placeholder="Add a neighborhood or meetup spot"
				value={fields.location}
				onChangeText={value => update('location', value)}
				maxLength={POST_LOCATION_MAX_LENGTH}
				error={submitted ? validation.location : undefined}
			/>
			<CharacterCount value={fields.location} limit={POST_LOCATION_MAX_LENGTH} />

			{/* <View style={styles.privacy}>
				<Text style={styles.privacyText}>Your exact address stays private until you choose to share it.</Text>
			</View> */}
			{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
			<Button label={postId ? 'Save changes' : `Publish ${type.toLowerCase()}`} onPress={publish} loading={loading} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	heading: { ...theme.typography.heading, color: theme.colors.text },
	segment: { flexDirection: 'row', backgroundColor: theme.colors.highlight, borderRadius: theme.radius.md, padding: 3, gap: 4 },
	segmentOption: { minHeight: theme.dimensions.touchTarget, flex: 1, borderRadius: theme.radius.md - 2, alignItems: 'center', justifyContent: 'center' },
	segmentSelected: { backgroundColor: theme.colors.text },
	segmentText: { ...theme.typography.button, color: theme.colors.text },
	segmentTextSelected: { color: theme.colors.surface },
	description: { minHeight: 112, paddingTop: theme.spacing.md },
	fieldGroup: { gap: theme.spacing.sm },
	characterCount: { ...theme.typography.caption, color: theme.colors.muted, textAlign: 'right', marginTop: -theme.spacing.md },
	characterCountWarning: { color: theme.colors.error },
	fieldLabel: { ...theme.typography.label, color: theme.colors.body },
	categories: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
	category: { minHeight: theme.dimensions.touchTarget, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, justifyContent: 'center' },
	categorySelected: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
	categoryText: { ...theme.typography.body, color: theme.colors.body },
	categoryTextSelected: { color: theme.colors.surface },
	privacy: { backgroundColor: theme.colors.subtle, borderRadius: theme.radius.md, padding: theme.spacing.md },
	privacyText: { ...theme.typography.caption, color: theme.colors.muted },
	error: { ...theme.typography.caption, color: theme.colors.error },
	success: { alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
	checkmark: { width: 64, height: 64, borderRadius: theme.radius.full, backgroundColor: theme.colors.successSurface, alignItems: 'center', justifyContent: 'center' },
	checkmarkText: { ...theme.typography.label, color: theme.colors.primary },
	supporting: { ...theme.typography.body, color: theme.colors.muted, textAlign: 'center' },
	postMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	badge: { ...theme.typography.label, overflow: 'hidden', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, color: theme.colors.text },
	offerBadge: { backgroundColor: theme.colors.primary },
	requestBadge: { backgroundColor: theme.colors.secondary },
	live: { ...theme.typography.caption, color: theme.colors.success },
	postTitle: { ...theme.typography.heading, color: theme.colors.text },
	body: { ...theme.typography.body, color: theme.colors.body },
	label: { ...theme.typography.caption, color: theme.colors.muted },
	rule: { height: 1, backgroundColor: theme.colors.border },
	notice: { borderRadius: theme.radius.md, padding: theme.spacing.md, backgroundColor: theme.colors.highlight },
	noticeText: { ...theme.typography.caption, color: theme.colors.text },
});
