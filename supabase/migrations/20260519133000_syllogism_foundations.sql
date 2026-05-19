alter table public.syllogism_questions
  add column if not exists question_mode text,
  add column if not exists rule_name text,
  add column if not exists key_takeaway text;

with block_sizes as (
  select macro_block_id, count(*) as question_count
  from public.syllogism_questions
  where macro_block_id is not null
  group by macro_block_id
)
update public.syllogism_questions q
set question_mode = case
  when bs.question_count = 5 then 'macro'
  else 'micro'
end
from block_sizes bs
where q.macro_block_id = bs.macro_block_id
  and q.question_mode is null;

update public.syllogism_questions
set question_mode = 'micro'
where question_mode is null;

alter table public.syllogism_questions
  alter column question_mode set default 'micro',
  alter column question_mode set not null;

alter table public.syllogism_questions
  drop constraint if exists syllogism_questions_question_mode_check;

alter table public.syllogism_questions
  add constraint syllogism_questions_question_mode_check
  check (question_mode in ('foundation', 'micro', 'macro'));

alter table public.syllogism_sessions
  drop constraint if exists syllogism_sessions_mode_check;

alter table public.syllogism_sessions
  add constraint syllogism_sessions_mode_check
  check (mode in ('foundation', 'micro', 'macro'));

delete from public.syllogism_questions
where question_mode = 'foundation'
  and trick_type like 'foundation_%';

insert into public.syllogism_questions (
  macro_block_id,
  question_mode,
  stimulus_text,
  conclusion_text,
  is_correct,
  logic_group,
  trick_type,
  explanation,
  rule_name,
  key_takeaway
) values
  (
    null,
    'foundation',
    'No elective modules are weekend sessions.',
    'If something is an elective module, it cannot be a weekend session.',
    true,
    'categorical',
    'foundation_no_forward',
    'The premise says the two groups do not overlap at all. Anything inside the elective-module group must therefore be outside the weekend-session group.',
    'No means no overlap',
    'No A are B guarantees that an A cannot be B.'
  ),
  (
    null,
    'foundation',
    'No archive records are live requests.',
    'If something is a live request, it cannot be an archive record.',
    true,
    'categorical',
    'foundation_no_reverse',
    'No-overlap statements work both ways. If no archive records are live requests, then no live requests can be archive records either.',
    'No is reversible',
    'No A are B also guarantees that no B are A.'
  ),
  (
    null,
    'foundation',
    'No ceramic samples are digital files.',
    'Some ceramic samples are digital files.',
    false,
    'categorical',
    'foundation_no_blocks_some',
    'The premise rules out every possible overlap between ceramic samples and digital files, so even one overlap would contradict it.',
    'No blocks some',
    'No A are B means you cannot also conclude that some A are B.'
  ),
  (
    null,
    'foundation',
    'All blue badges are verified passes.',
    'If something is a blue badge, it is a verified pass.',
    true,
    'categorical',
    'foundation_all_forward',
    'All tells you that the whole blue-badge group sits inside the verified-pass group. A blue badge must therefore be a verified pass.',
    'All travels forwards',
    'All A are B guarantees that any A is B.'
  ),
  (
    null,
    'foundation',
    'All theatre scripts are draft documents.',
    'Every draft document is a theatre script.',
    false,
    'categorical',
    'foundation_all_converse_trap',
    'The premise puts theatre scripts inside draft documents. It does not say the draft-document group contains only theatre scripts.',
    'All is not reversible',
    'All A are B does not prove that all B are A.'
  ),
  (
    null,
    'foundation',
    'All safety briefings are scheduled meetings.',
    'It is possible that every scheduled meeting is a safety briefing.',
    true,
    'categorical',
    'foundation_all_allows_equal_groups',
    'The premise only says safety briefings are within scheduled meetings. It does not rule out the two groups being exactly the same size.',
    'All allows equality',
    'All A are B allows, but does not require, all B to be A.'
  ),
  (
    null,
    'foundation',
    'All river surveys are field reports.',
    'Some river surveys are not field reports.',
    false,
    'categorical',
    'foundation_all_blocks_some_not',
    'If every river survey is a field report, there cannot be even one river survey outside the field-report group.',
    'All excludes exceptions',
    'All A are B means no A can be outside B.'
  ),
  (
    null,
    'foundation',
    'Some library cards are temporary permits.',
    'At least one temporary permit is a library card.',
    true,
    'relative',
    'foundation_some_reverse',
    'Some means there is at least one item in the overlap. That same overlapping item is both a library card and a temporary permit.',
    'Some is reversible',
    'Some A are B guarantees that some B are A.'
  ),
  (
    null,
    'foundation',
    'Some trial shifts are morning shifts.',
    'All trial shifts are morning shifts.',
    false,
    'relative',
    'foundation_some_not_all',
    'Some only proves at least one overlap. It gives no guarantee about every trial shift.',
    'Some is not all',
    'Some A are B does not prove that all A are B.'
  ),
  (
    null,
    'foundation',
    'Some mural sketches are approved designs.',
    'It is possible that some mural sketches are not approved designs.',
    true,
    'relative',
    'foundation_some_allows_some_not',
    'The premise confirms at least one mural sketch is approved. It does not rule out other mural sketches being unapproved.',
    'Some leaves room',
    'Some A are B allows the possibility that some A are not B.'
  ),
  (
    null,
    'foundation',
    'Some orchard maps are laminated sheets.',
    'No orchard maps are laminated sheets.',
    false,
    'relative',
    'foundation_some_contradicts_no',
    'The premise says there is at least one overlap, while the conclusion says there is no overlap. Both cannot be true.',
    'Some defeats no',
    'Some A are B means it is false that no A are B.'
  ),
  (
    null,
    'foundation',
    'Some coding workshops are evening classes.',
    'At least one coding workshop is an evening class.',
    true,
    'relative',
    'foundation_some_at_least_one',
    'In UCAT syllogisms, some means at least one. This conclusion simply restates that minimum overlap.',
    'Some means at least one',
    'Some A are B guarantees at least one A that is B.'
  ),
  (
    null,
    'foundation',
    'Most practice sets are timed tasks.',
    'Some practice sets are timed tasks.',
    true,
    'majority',
    'foundation_most_implies_some',
    'Most means more than half. If more than half of the practice sets are timed tasks, at least one practice set must be a timed task.',
    'Most includes some',
    'Most A are B guarantees that some A are B.'
  ),
  (
    null,
    'foundation',
    'Most consent forms are scanned records.',
    'Most scanned records are consent forms.',
    false,
    'majority',
    'foundation_most_converse_trap',
    'The majority claim is about consent forms, not scanned records. The scanned-record group could be much larger.',
    'Most is not reversible',
    'Most A are B does not prove that most B are A.'
  ),
  (
    null,
    'foundation',
    'Most campus tours are guided visits.',
    'All campus tours are guided visits.',
    false,
    'majority',
    'foundation_most_not_all',
    'Most is still weaker than all. It allows there to be campus tours that are not guided visits.',
    'Most is not all',
    'Most A are B does not prove that all A are B.'
  ),
  (
    null,
    'foundation',
    'Most rehearsal rooms are booked spaces.',
    'Some booked spaces are rehearsal rooms.',
    true,
    'majority',
    'foundation_most_some_reverse',
    'Most rehearsal rooms being booked spaces guarantees at least one overlap, and any overlapping item can be described in either direction.',
    'Most creates reversible overlap',
    'Most A are B guarantees that some B are A.'
  ),
  (
    null,
    'foundation',
    'All pilot interviews are recorded sessions. No recorded sessions are informal chats.',
    'No pilot interviews are informal chats.',
    true,
    'complex',
    'foundation_all_no_chain',
    'Pilot interviews sit inside recorded sessions, and recorded sessions have no overlap with informal chats. So pilot interviews cannot overlap with informal chats.',
    'All plus no can chain',
    'If all A are B and no B are C, then no A are C.'
  ),
  (
    null,
    'foundation',
    'All bronze tokens are member passes. Some member passes are weekend tickets.',
    'Some bronze tokens are weekend tickets.',
    false,
    'complex',
    'foundation_all_some_weak_chain',
    'The weekend-ticket overlap may involve member passes that are not bronze tokens. The premises do not force any bronze token to be a weekend ticket.',
    'Some breaks the chain',
    'All A are B plus some B are C does not prove that some A are C.'
  ),
  (
    null,
    'foundation',
    'No winter clinics are drop-in appointments. All emergency slots are drop-in appointments.',
    'No emergency slots are winter clinics.',
    true,
    'complex',
    'foundation_no_all_exclusion',
    'Emergency slots are inside the drop-in group, and winter clinics are completely outside that group. So emergency slots cannot be winter clinics.',
    'Exclusion transfers through all',
    'If no A are B and all C are B, then no C are A.'
  ),
  (
    null,
    'foundation',
    'All evening seminars are ticketed events. No ticketed events are walk-in activities.',
    'Some evening seminars are walk-in activities.',
    false,
    'complex',
    'foundation_all_no_blocks_some',
    'Every evening seminar is ticketed, and ticketed events cannot be walk-in activities. The proposed overlap is impossible.',
    'A no-link blocks overlap',
    'If all A are B and no B are C, then some A are C cannot follow.'
  ),
  (
    null,
    'foundation',
    'If a parcel is priority mail, then it is tracked. This parcel is priority mail.',
    'This parcel is tracked.',
    true,
    'complex',
    'foundation_conditional_forward',
    'The condition is met: the parcel is priority mail. The result in the rule must therefore apply.',
    'Conditional forward step',
    'If A then B, and A is true, B must be true.'
  ),
  (
    null,
    'foundation',
    'If a badge is expired, then it is invalid. This badge is invalid.',
    'This badge is expired.',
    false,
    'complex',
    'foundation_conditional_affirming_consequent',
    'The rule says expired badges are invalid, but it does not say invalid badges are only expired. There could be another reason for invalidity.',
    'Do not reverse if-then',
    'If A then B does not prove that B means A.'
  ),
  (
    null,
    'foundation',
    'If a room is sterile, then it is sealed. This room is not sealed.',
    'This room is not sterile.',
    true,
    'complex',
    'foundation_conditional_contrapositive',
    'A sterile room would have to be sealed. Since this room is not sealed, it cannot be sterile.',
    'Contrapositive works',
    'If A then B, and B is false, A must be false.'
  ),
  (
    null,
    'foundation',
    'If a voucher is digital, then it has a code. This voucher is not digital.',
    'This voucher does not have a code.',
    false,
    'complex',
    'foundation_conditional_denying_antecedent',
    'Digital vouchers must have codes, but non-digital vouchers might also have codes. The rule does not tell us either way.',
    'Do not deny the first part',
    'If A then B, and A is false, B could still be true.'
  ),
  (
    null,
    'foundation',
    'Every research applicant has at least one of a portfolio or a transcript.',
    'A research applicant can have neither a portfolio nor a transcript.',
    false,
    'complex',
    'foundation_either_or_not_neither',
    'Having at least one of the two options rules out having neither. Each applicant must have a portfolio, a transcript, or both.',
    'At least one rules out neither',
    'If every A has B or C, an A cannot have neither.'
  ),
  (
    null,
    'foundation',
    'Every field kit contains at least one of a compass or a torch. This field kit does not contain a compass.',
    'This field kit contains a torch.',
    true,
    'complex',
    'foundation_either_or_elimination',
    'The kit must contain at least one of the two items. Once compass is ruled out, torch is the only remaining way to satisfy the premise.',
    'Eliminate one option',
    'If A must have B or C, and not B, then A must have C.'
  ),
  (
    null,
    'foundation',
    'Every gallery ticket is either a day ticket or a member ticket.',
    'All gallery tickets are day tickets.',
    false,
    'complex',
    'foundation_either_or_no_specific_option',
    'The premise guarantees each gallery ticket has one of the listed classifications. It does not choose day ticket for every gallery ticket.',
    'Either/or does not pick a side',
    'A or B does not by itself prove A.'
  );

create or replace function public.get_syllogism_foundation_batch(p_count integer default 12)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  result jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 12), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation,
        'rule_name', q.rule_name,
        'key_takeaway', q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from (
    select sq.*
    from public.syllogism_questions sq
    where sq.question_mode = 'foundation'
    order by random()
    limit n
  ) q;

  return result;
end;
$$;

create or replace function public.get_syllogism_micro_batch(p_count integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  result jsonb;
begin
  n := greatest(1, least(coalesce(p_count, 10), 50));

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation,
        'rule_name', q.rule_name,
        'key_takeaway', q.key_takeaway
      )
    ),
    '[]'::jsonb
  )
  into result
  from (
    select sq.*
    from public.syllogism_questions sq
    where sq.question_mode = 'micro'
    order by random()
    limit n
  ) q;

  return result;
end;
$$;

create or replace function public.get_syllogism_macro_block(p_exclude_block_ids uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_block uuid;
  result jsonb;
begin
  select sq.macro_block_id into chosen_block
  from public.syllogism_questions sq
  where sq.question_mode = 'macro'
    and sq.macro_block_id is not null
    and not (sq.macro_block_id = any (coalesce(p_exclude_block_ids, '{}')))
  group by sq.macro_block_id
  having count(*) = 5
  order by random()
  limit 1;

  if chosen_block is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'macro_block_id', q.macro_block_id,
        'stimulus_text', q.stimulus_text,
        'media', coalesce(q.media, '[]'::jsonb),
        'conclusion_text', q.conclusion_text,
        'is_correct', q.is_correct,
        'logic_group', q.logic_group,
        'trick_type', q.trick_type,
        'explanation', q.explanation,
        'rule_name', q.rule_name,
        'key_takeaway', q.key_takeaway
      )
      order by q.id
    ),
    '[]'::jsonb
  )
  into result
  from public.syllogism_questions q
  where q.question_mode = 'macro'
    and q.macro_block_id = chosen_block;

  return result;
end;
$$;

grant execute on function public.get_syllogism_foundation_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_micro_batch(integer) to anon, authenticated;
grant execute on function public.get_syllogism_macro_block(uuid[]) to anon, authenticated;
