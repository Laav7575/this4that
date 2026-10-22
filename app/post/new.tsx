import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button, Card, Input } from '../../components/ui';
import { theme } from '../../constants/theme';
import { createPost } from '../../services/backend';
import type { PostInput, PostRow } from '../../types/database';

const categories = ['Tutoring', 'Technology', 'Errands', 'Moving', 'Pets', 'Handy help', 'Other'];

type Fields = Omit<PostInput, 'type'>;
const POST_TITLE_MAX_LENGTH = 80;

const initialFields: Fields = {
	title: '',
	description: '',
	category: '',
	availability: '',
	location: '',
};

export default function NewPost() {
	const [type, setType] = useState<PostInput['type']>('Request');
	const [fields, setFields] = useState<Fields>(initialFields);
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [createdPost, setCreatedPost] = useState<PostRow>();

	const validation = {
		title: !fields.title.trim() ? 'Enter a title.' : fields.title.trim().length > POST_TITLE_MAX_LENGTH ? `Use ${POST_TITLE_MAX_LENGTH} characters or fewer.` : undefined,
		description: !fields.description.trim() ? 'Enter a description.' : fields.description.trim().length > 500 ? 'Use 500 characters or fewer.' : undefined,
		category: !fields.category.trim() || fields.category === 'Other' ? 'Select or enter a category.' : undefined,
		availability: !fields.availability.trim() ? 'Add when you are available.' : undefined,
		location: !fields.location.trim() ? 'Add a neighborhood or meetup spot.' : undefined,
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
			const post = await createPost({
				...fields,
				title: fields.title.trim(),
				description: fields.description.trim(),
				category: fields.category.trim(),
				availability: fields.availability.trim(),
				location: fields.location.trim(),
				type,
			});
			setCreatedPost(post);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Could not publish your post. Try again.');
		} finally {
			setLoading(false);
		}
	};

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
					<Text style={styles.label}>TIMING</Text>
					<Text style={styles.body}>{createdPost.availability}</Text>
					<Text style={styles.label}>LOCATION</Text>
					<Text style={styles.body}>{createdPost.location}</Text>
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
			<Text accessibilityRole="header" style={styles.heading}>New post</Text>

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

			<Input
				label="Title"
				placeholder={type === 'Offer' ? 'What can you help with?' : 'What do you need help with?'}
				value={fields.title}
				onChangeText={value => update('title', value)}
				maxLength={POST_TITLE_MAX_LENGTH}
				error={submitted ? validation.title : undefined}
			/>
			<Input
				label="Description"
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

			<View style={styles.fieldGroup}>
				<Text style={styles.fieldLabel}>Category</Text>
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
						label="Your category"
						placeholder="Enter a category"
						value={customCategory}
						onChangeText={value => update('category', value)}
						error={submitted ? validation.category : undefined}
					/>
				)}
				{submitted && validation.category && categoryChoice !== 'Other' && <Text style={styles.error}>{validation.category}</Text>}
			</View>

			<Input
				label="Availability"
				placeholder="Add timing, e.g. Saturday, 1-4 PM"
				value={fields.availability}
				onChangeText={value => update('availability', value)}
				error={submitted ? validation.availability : undefined}
			/>
			<Input
				label="Location"
				placeholder="Add a neighborhood or meetup spot"
				value={fields.location}
				onChangeText={value => update('location', value)}
				error={submitted ? validation.location : undefined}
			/>

			<View style={styles.privacy}>
				<Text style={styles.privacyText}>Your exact address stays private until you choose to share it.</Text>
			</View>
			{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
			<Button label={`Publish ${type.toLowerCase()}`} onPress={publish} loading={loading} />
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
