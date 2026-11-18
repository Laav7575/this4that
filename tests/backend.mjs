import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite({ extensions: { pg_trgm } });
// Minimal Supabase Auth/roles fixture. PGlite runs actual PostgreSQL policies, not JS simulations.
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`);
await db.exec(await readFile(new URL('../supabase/migrations/202610120001_backend.sql', import.meta.url), 'utf8'));
const migrationOwner = '00000000-0000-0000-0000-000000000006';
await db.query("insert into auth.users values ($1,'migration@uwaterloo.ca',now())", [migrationOwner]);
await db.query("insert into public.profiles(id,name) values ($1,'Migration fixture')", [migrationOwner]);
await db.query(`insert into public.posts(author_id,title,description,category,type,availability,location)
  values ($1,'Old tutoring','Details','Tutoring','Request','Now','Campus'),
    ($1,'Academic and career help','Details','Academic and Career Help','Request','Now','Campus'),
    ($1,'Old moving','Details','Moving','Request','Now','Campus'),
    ($1,'Household help','Details','Household Help','Request','Now','Campus'),
    ($1,'Old handy help','Details','Handy help','Request','Now','Campus'),
    ($1,'Arts and crafts','Details','Arts & Crafts','Request','Now','Campus'),
    ($1,'Keep technology','Details','Technology','Request','Now','Campus'),
    ($1,'Keep errands','Details','Errands','Request','Now','Campus'),
    ($1,'Keep pets','Details','Pets','Request','Now','Campus'),
    ($1,'Keep other','Details','Other','Request','Now','Campus')`, [migrationOwner]);
await db.exec(await readFile(new URL('../supabase/migrations/202611180002_post_category_renames.sql', import.meta.url), 'utf8'));
assert.deepEqual(
  (await db.query("select category from public.posts where author_id=$1 order by title", [migrationOwner])).rows.map(row => row.category),
  ['Academic', 'Creative', 'Household', 'Errands', 'Other', 'Pets', 'Technology', 'Creative', 'Household', 'Academic'],
);
await db.query('delete from public.profiles where id=$1', [migrationOwner]);
await db.exec(await readFile(new URL('../supabase/migrations/202610180001_post_search.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/202610180002_location_search.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/202610200001_partial_post_search.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/202611170001_terms_acceptances.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/202611180001_post_availability_location_limits.sql', import.meta.url), 'utf8'));
const a = '00000000-0000-0000-0000-000000000001';
const b = '00000000-0000-0000-0000-000000000002';
const outsider = '00000000-0000-0000-0000-000000000003';
const unconfirmed = '00000000-0000-0000-0000-000000000004';
const nonstudent = '00000000-0000-0000-0000-000000000005';
await db.query(`insert into auth.users values ($1,'a@uwaterloo.ca',now()),($2,'b@uwaterloo.ca',now()),
  ($3,'c@uwaterloo.ca',now()),($4,'d@uwaterloo.ca',null),($5,'e@example.com',now())`, [a,b,outsider,unconfirmed,nonstudent]);
await db.query('insert into public.profiles(id,name) values ($1,\'A\'),($2,\'B\'),($3,\'C\')', [a,b,outsider]);
async function asUser(id, callback) {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { return await callback(); } finally { await db.exec('reset role'); }
}
await asUser(a, async () => {
  await assert.rejects(db.query('insert into profiles(id,name) values ($1,\'Spoof\')',[unconfirmed]));
  const result = await db.query('update profiles set name=\'Spoof\' where id=$1 returning id',[b]);
  assert.equal(result.rows.length,0);
  await db.query('update profiles set bio=\'My bio\' where id=$1',[a]);
});
await asUser(a, async () => {
  assert.equal((await db.query('select * from terms_acceptances')).rows.length, 0);
  await assert.rejects(db.query("insert into terms_acceptances (user_id, terms_version) values ($1, 'draft-1')", [b]));
  await assert.rejects(db.query("insert into terms_acceptances (user_id, terms_version, accepted_at) values ($1, 'draft-1', now())", [a]));
  const accept = "insert into terms_acceptances (user_id, terms_version) values ($1, 'v1') on conflict (user_id, terms_version) do nothing";
  await db.query(accept, [a]);
  await db.query(accept, [a]);
  const { rows } = await db.query('select * from terms_acceptances');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].terms_version, 'v1');
  assert.ok(rows[0].accepted_at instanceof Date);
});
await asUser(b, async () => {
  assert.equal((await db.query('select * from terms_acceptances')).rows.length, 0);
});
const post = await asUser(a, async () => {
  const { rows } = await db.query(`insert into posts(author_id,title,description,category,type,availability,location)
    values ($1,'Tutoring','Calculus help','Academic','Offer','Weekends','Library') returning id`,[a]);
  await assert.rejects(db.query(`insert into posts(author_id,title,description,category,type,availability,location)
    values ($1,'Long availability','Calculus help','Academic','Offer',$2,'Library')`, [a, 'x'.repeat(61)]));
  await assert.rejects(db.query(`insert into posts(author_id,title,description,category,type,availability,location)
    values ($1,'Long location','Calculus help','Academic','Offer','Weekends',$2)`, [a, 'x'.repeat(61)]));
  const maxLengthPost = await db.query(`insert into posts(author_id,title,description,category,type,availability,location)
    values ($1,'Max length','Calculus help','Academic','Offer',$2,$2) returning id`, [a, 'x'.repeat(60)]);
  await db.query('delete from posts where id=$1', [maxLengthPost.rows[0].id]);
  return rows[0].id;
});
const olderPost = (await db.query(`insert into posts(author_id,title,description,category,type,availability,location,created_at)
  values ($1,'Old tutoring post','Older listing','Academic','Offer','Weekends','Davis Centre Library',now() - interval '8 days')
  returning id`,[a])).rows[0].id;
const wildcardPost = (await db.query(`insert into posts(author_id,title,description,category,type,availability,location)
  values ($1,'100% match','Literal wildcard sample','Academic','Offer','Weekends','Library') returning id`,[a])).rows[0].id;
await asUser(b, async () => {
  const matches = await db.query(`select id from posts
    where search_document @@ websearch_to_tsquery('english', $1)`, ['calculus library']);
  assert.deepEqual(matches.rows.map(row => row.id), [post]);
  assert.deepEqual((await db.query(`select id from posts
    where location_search_document @@ websearch_to_tsquery('english', $1)
    order by title`, ['library'])).rows.map(row => row.id), [wildcardPost, olderPost, post]);
  assert.deepEqual((await db.query(`select id from posts
    where location_search_document @@ websearch_to_tsquery('english', $1)`, ['Davis Centre'])).rows.map(row => row.id), [olderPost]);
  assert.deepEqual((await db.query(`select id from posts
    where location_search_document @@ websearch_to_tsquery('english', $1)`, ['calculus'])).rows, []);
  assert.deepEqual((await db.query(`select id from posts
    where created_at >= now() - interval '1 day' and type = 'Offer' and category = 'Academic'
      and title != '100% match'`)).rows.map(row => row.id), [post]);
  assert.deepEqual((await db.query(`select id from posts
    where created_at >= now() - interval '7 days' and type = 'Offer' and category = 'Academic'
      and title != '100% match'`)).rows.map(row => row.id), [post]);
  assert.deepEqual((await db.query(`select id from posts
    where created_at >= now() - interval '30 days' and type = 'Offer' and category = 'Academic'
      and title != '100% match' order by created_at desc`)).rows.map(row => row.id), [post, olderPost]);
  assert.deepEqual((await db.query(`select id from search_posts(0, 50, null, null, 'culu', null, null)`)).rows.map(row => row.id), [post]);
  assert.deepEqual((await db.query(`select id from search_posts(0, 50, null, null, null, 'vis Centre', null)`)).rows.map(row => row.id), [olderPost]);
  assert.deepEqual((await db.query(`select id from search_posts(0, 50, null, null, '%', null, null)`)).rows.map(row => row.id), [wildcardPost]);
  assert.deepEqual((await db.query(`select id from search_posts(0, 50, 'Academic', 'Offer', 'culu', null, now() - interval '1 day')`)).rows.map(row => row.id), [post]);
  assert.deepEqual((await db.query(`select id from search_posts(0, 50, null, null, 'culu', null, now() - interval '1 day')`)).rows.map(row => row.id), [post]);
  assert.deepEqual((await db.query('select * from get_post_categories()')).rows, [{ category: 'Academic' }]);
});
await asUser(b, async () => {
  await assert.rejects(db.query(`insert into posts(author_id,title,description,category,type,availability,location)
    values ($1,'Spoof','Text','Academic','Offer','Now','Library')`,[a]));
  assert.equal((await db.query('update posts set title=\'Spoof\' where id=$1 returning id',[post])).rows.length,0);
  assert.equal((await db.query('delete from posts where id=$1 returning id',[post])).rows.length,0);
  await assert.rejects(db.query('update posts set author_id=$1 where id=$2',[b,post]));
});
for (const id of [unconfirmed,nonstudent]) await asUser(id, async () => {
  assert.equal((await db.query('select * from posts')).rows.length,0);
  await assert.rejects(db.query('insert into profiles(id,name) values ($1,\'Invalid\')',[id]));
  await assert.rejects(db.query('select create_conversation($1)',[b]));
});
const conversation = await asUser(a, async () => (await db.query('select create_conversation($1,$2) as id',[b,post])).rows[0].id);
await asUser(a, async () => {
  assert.equal((await db.query('select * from conversation_participants')).rows.length,2);
  await db.query('insert into messages(conversation_id,sender_id,content) values ($1,$2,\'Hello\')',[conversation,a]);
  await assert.rejects(db.query('insert into messages(conversation_id,sender_id,content) values ($1,$2,\'Spoof\')',[conversation,b]));
  await assert.rejects(db.query('insert into messages(conversation_id,sender_id,content) values ($1,$2,\'  \')',[conversation,a]));
});
// Reproduce legacy duplicates, then migrate without dropping either history.
const duplicate = await asUser(b, async () => (await db.query('select create_conversation($1) as id',[a])).rows[0].id);
await asUser(b, async () => db.query("insert into messages(conversation_id,sender_id,content) values ($1,$2,'Second thread')",[duplicate,b]));
const beforeMerge = (await db.query('select id, sender_id, content, timestamp from messages order by id')).rows;
await db.exec(await readFile(new URL('../supabase/migrations/202610200001_one_conversation_per_pair.sql', import.meta.url), 'utf8'));
const canonical = (await db.query('select id from conversations')).rows[0].id;
assert.equal((await db.query('select * from conversations')).rows.length,1);
assert.deepEqual((await db.query('select id, sender_id, content, timestamp from messages order by id')).rows,beforeMerge);
assert.equal((await db.query('select * from conversation_participants')).rows.length,2);
const secondPost = (await db.query(`insert into posts(author_id,title,description,category,type,availability,location)
  values ($1,'Moving','Help moving','Household','Request','Saturday','Campus') returning id`,[b])).rows[0].id;
for (const [caller, other] of [[a,b],[b,a]]) await asUser(caller, async () => {
  for (const context of [post,secondPost,null]) {
    assert.equal((await db.query('select create_conversation($1,$2) as id',[other,context])).rows[0].id,canonical);
  }
  assert.equal((await db.query('select * from messages')).rows.length,2);
  await assert.rejects(db.query('select create_conversation($1)',[caller]));
});
assert.equal((await db.query('select * from conversations')).rows.length,1);
await db.exec(await readFile(new URL('../supabase/migrations/202610230001_conversation_latest_post.sql', import.meta.url), 'utf8'));
// Reopening from another post reuses the chat, switches its exchange card and adds one notice naming both posts.
const notices = async () => (await db.query('select sender_id, content, post_id from messages where post_id is not null order by timestamp, id')).rows;
const card = async () => (await db.query('select related_post_id from conversations where id=$1',[canonical])).rows[0].related_post_id;
for (const context of [post,null]) await asUser(a, async () => db.query('select create_conversation($1,$2)',[b,context]));
assert.equal((await notices()).length,0);
for (let i = 0; i < 2; i++) await asUser(a, async () =>
  assert.equal((await db.query('select create_conversation($1,$2) as id',[b,secondPost])).rows[0].id,canonical));
const original = (await db.query('select title from posts where id=$1',[post])).rows[0].title;
assert.deepEqual(await notices(),[{ sender_id: a, content: `Now talking about “Moving”\nPreviously: “${original}”`, post_id: secondPost }]);
assert.equal(await card(),secondPost);
await asUser(b, async () => db.query('select create_conversation($1)',[a]));
assert.equal(await card(),secondPost);
await asUser(b, async () => db.query('select create_conversation($1,$2)',[a,post]));
assert.equal((await notices()).length,2);
assert.equal(await card(),post);
assert.equal((await db.query('select * from conversations')).rows.length,1);
// Students cannot forge notices.
await asUser(a, async () => assert.rejects(db.query('insert into messages(conversation_id,sender_id,content,post_id) values ($1,$2,$3,$4)',[canonical,a,'Fake',post])));
// A different pair still gets a separate conversation.
const separate = await asUser(a, async () => (await db.query('select create_conversation($1) as id',[outsider])).rows[0].id);
assert.notEqual(separate,canonical);
await db.query('delete from conversations where id=$1',[separate]);
await asUser(outsider, async () => {
  for (const table of ['messages','conversations','conversation_participants']) assert.equal((await db.query(`select * from ${table}`)).rows.length,0);
  await assert.rejects(db.query('insert into messages(conversation_id,sender_id,content) values ($1,$2,\'Intrusion\')',[conversation,outsider]));
  await assert.rejects(db.query('insert into conversation_participants values ($1,$2)',[conversation,outsider]));
  await assert.rejects(db.query('select create_conversation($1,$2)',[b,post]));
});
await db.exec('set role anon');
await assert.rejects(db.query('select * from profiles'));
await assert.rejects(db.query('select * from get_post_categories()'));
await assert.rejects(db.query('select create_conversation($1)',[b]));
await db.exec('reset role');
assert(!(await db.query("select column_name from information_schema.columns where table_name='profiles'")).rows.some(r=>['email','uw_verified'].includes(r.column_name)));
await db.close();
console.log('PASS: duplicate-history merge, per-person reuse across posts and directions, separate pairs, migration, ownership, confirmed Waterloo access, participant isolation, sender spoofing, membership escalation, anonymous denial, private email separation, and terms acceptance permissions and retries.');
