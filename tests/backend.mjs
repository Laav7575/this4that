import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
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
const post = await asUser(a, async () => {
  const { rows } = await db.query(`insert into posts(author_id,title,description,category,type,availability,location)
    values ($1,'Tutoring','Calculus help','Tutoring','Offer','Weekends','Library') returning id`,[a]);
  return rows[0].id;
});
await asUser(b, async () => {
  await assert.rejects(db.query(`insert into posts(author_id,title,description,category,type,availability,location)
    values ($1,'Spoof','Text','Tutoring','Offer','Now','Library')`,[a]));
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
  values ($1,'Moving','Help moving','Moving','Request','Saturday','Campus') returning id`,[b])).rows[0].id;
for (const [caller, other] of [[a,b],[b,a]]) await asUser(caller, async () => {
  for (const context of [post,secondPost,null]) {
    assert.equal((await db.query('select create_conversation($1,$2) as id',[other,context])).rows[0].id,canonical);
  }
  assert.equal((await db.query('select * from messages')).rows.length,2);
  await assert.rejects(db.query('select create_conversation($1)',[caller]));
});
assert.equal((await db.query('select * from conversations')).rows.length,1);
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
await assert.rejects(db.query('select create_conversation($1)',[b]));
await db.exec('reset role');
assert(!(await db.query("select column_name from information_schema.columns where table_name='profiles'")).rows.some(r=>['email','uw_verified'].includes(r.column_name)));
await db.close();
console.log('PASS: duplicate-history merge, per-person reuse across posts and directions, separate pairs, migration, ownership, confirmed Waterloo access, participant isolation, sender spoofing, membership escalation, anonymous denial, and private email separation.');
