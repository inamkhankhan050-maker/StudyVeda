// Security test for the real schema + RLS policies, run against an in-process PostgreSQL (PGlite).
// It recreates the small part of Supabase the schema relies on (auth.users, auth.uid(), anon/authenticated roles).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };
const as = async (role, uid) => {
  await db.exec('reset role');
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid || ''}', false)`);
  await db.exec(`set role ${role}`);
};
const tryq = async (sql, params) => { try { return { rows: (await db.query(sql, params)).rows }; } catch (e) { return { error: e.message }; } };

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users values
    ('11111111-1111-1111-1111-111111111111','admin@example.com'),
    ('22222222-2222-2222-2222-222222222222','student1@example.com'),
    ('33333333-3333-3333-3333-333333333333','student2@example.com');
`);
await db.exec(readFileSync(new URL('../../supabase/migrations/001_schema.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../../supabase/create_first_admin.sql', import.meta.url), 'utf8').replace('YOUR_ADMIN_EMAIL@example.com', 'admin@example.com'));
ok('schema, seed and first-admin script load without errors', true);

const ADMIN = '11111111-1111-1111-1111-111111111111', S1 = '22222222-2222-2222-2222-222222222222', S2 = '33333333-3333-3333-3333-333333333333';
const total = (await db.query('select count(*)::int n from questions')).rows[0].n;
const drafts = (await db.query("select count(*)::int n from questions where status='draft'")).rows[0].n;
const subjId = (await db.query("select id from subjects where slug='aptitude'")).rows[0].id;
const topicId = (await db.query("select id from topics where slug='percentage'")).rows[0].id;
const pyTopic = (await db.query("select id from topics where slug='python-basics'")).rows[0].id;

// ---------- anonymous visitor ----------
await as('anon');
let r = await tryq('select count(*)::int n from questions');
ok(`anon sees only published questions (${r.rows?.[0].n} of ${total}; ${drafts} drafts hidden)`, r.rows?.[0].n === total - drafts);
r = await tryq("select count(*)::int n from questions where status='draft'");
ok('anon cannot read draft questions even when asking for them', r.rows?.[0].n === 0);
r = await tryq(`insert into questions (subject_id, question, option_a, option_b, option_c, option_d, correct_option) values ($1,'Hacked question?','a','b','c','d','A')`, [subjId]);
ok('anon cannot insert questions', !!r.error);
r = await tryq("update subjects set name='x' where slug='aptitude' returning id");
ok('anon cannot update subjects', !!r.error || r.rows.length === 0);
r = await tryq(`insert into admins values ('${S1}')`);
ok('anon cannot create an admin', !!r.error);

// ---------- signed-in student ----------
await as('authenticated', S1);
r = await tryq("select count(*)::int n from questions where status='draft'");
ok('student cannot read drafts', r.rows?.[0].n === 0);
r = await tryq(`insert into admins values ('${S1}')`);
ok('student cannot make themselves admin', !!r.error);
r = await tryq('select public.is_admin() a');
ok('is_admin() is false for a student', r.rows?.[0].a === false);
r = await tryq(`insert into questions (subject_id, question, option_a, option_b, option_c, option_d, correct_option) values ($1,'Student written question?','a','b','c','d','A')`, [subjId]);
ok('student cannot insert questions', !!r.error);
r = await tryq('delete from questions returning id');
ok('student cannot delete questions', !!r.error || r.rows.length === 0);
r = await tryq("update questions set correct_option='A' returning id");
ok('student cannot change answers', !!r.error || r.rows.length === 0);
r = await tryq(`insert into attempts (source_type, source_slug, title, mode, total, correct, incorrect, unanswered) values ('set','python-basics','Python Basics','test',6,4,1,1) returning user_id`);
ok('student can save their own attempt (user_id defaults to them)', r.rows?.[0].user_id === S1);
r = await tryq(`insert into attempts (user_id, source_type, source_slug, title, mode, total, correct, incorrect, unanswered) values ('${S2}','set','x','x','test',1,1,0,0)`);
ok('student cannot write an attempt for someone else', !!r.error);
r = await tryq(`insert into attempts (source_type, source_slug, title, mode, total, correct, incorrect, unanswered) values ('set','x','x','test',5,5,5,5)`);
ok('inconsistent score totals are rejected', !!r.error);

await as('authenticated', S2);
r = await tryq('select count(*)::int n from attempts');
ok("student 2 cannot see student 1's attempts", r.rows?.[0].n === 0);
r = await tryq('delete from attempts returning id');
ok("student 2 cannot delete student 1's attempts", r.rows?.length === 0);

// ---------- admin ----------
await as('authenticated', ADMIN);
r = await tryq('select public.is_admin() a');
ok('is_admin() is true for the configured admin', r.rows?.[0].a === true);
r = await tryq('select count(*)::int n from questions');
ok('admin sees drafts too', r.rows?.[0].n === total);
r = await tryq(`insert into questions (subject_id, topic_id, question, option_a, option_b, option_c, option_d, correct_option, status) values ($1,$2,'What is 10% of 50?','5','10','15','20','A','draft') returning id, created_by, created_at`, [subjId, topicId]);
ok('admin can create a question; creator + timestamp recorded', r.rows?.[0].created_by === ADMIN && !!r.rows[0].created_at);
const newId = r.rows?.[0].id;
r = await tryq(`insert into questions (subject_id, topic_id, question, option_a, option_b, option_c, option_d, correct_option) values ($1,$2,'What  is 10% of 50?','5','10','15','20','A')`, [subjId, topicId]);
ok('duplicate question text in the same subject is rejected', !!r.error);
r = await tryq(`insert into questions (subject_id, question, option_a, option_b, option_c, option_d, correct_option) values ($1,'Bad answer key?','a','b','c','d','E')`, [subjId]);
ok('invalid correct option (E) is rejected', !!r.error);
r = await tryq(`insert into questions (subject_id, question, option_a, option_b, option_c, option_d, correct_option) values ($1,'Duplicate options?','same','Same','c','d','A')`, [subjId]);
ok('duplicate options are rejected', !!r.error);
r = await tryq(`insert into questions (subject_id, topic_id, question, option_a, option_b, option_c, option_d, correct_option) values ($1,$2,'Topic from another subject?','a','b','c','d','A')`, [subjId, pyTopic]);
ok('a topic from a different subject is rejected', !!r.error);
r = await tryq("delete from subjects where slug='aptitude'");
ok('subject with questions cannot be deleted (FK restrict)', !!r.error);
r = await tryq("insert into subjects (slug, name) values ('aptitude', 'Aptitude 2')");
ok('duplicate subject slug is rejected', !!r.error);

// publish → visible to public; unpublish → hidden
await tryq(`update questions set status='published' where id=$1`, [newId]);
await as('anon');
r = await tryq('select count(*)::int n from questions where id=$1', [newId]);
ok('after publishing, the question is public', r.rows?.[0].n === 1);
await as('authenticated', ADMIN);
await tryq(`update questions set status='draft' where id=$1`, [newId]);
await as('anon');
r = await tryq('select count(*)::int n from questions where id=$1', [newId]);
ok('after unpublishing, the question is hidden again', r.rows?.[0].n === 0);

// unpublishing a subject hides its questions
await as('authenticated', ADMIN);
await tryq("update subjects set status='draft' where slug='sql'");
await as('anon');
r = await tryq("select count(*)::int n from questions q join subjects s on s.id=q.subject_id where s.slug='sql'");
const r2 = await tryq("select count(*)::int n from questions where subject_id=(select id from subjects where slug='python')");
ok('questions of an unpublished subject are hidden from the public', r.rows?.[0].n === 0 && r2.rows?.[0].n > 0);
r = await tryq("select question_count::int n from subject_stats where subject_id=(select id from subjects where slug='python')");
ok('public stats count only published questions', r.rows?.[0].n === 6);

await db.exec('reset role');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
