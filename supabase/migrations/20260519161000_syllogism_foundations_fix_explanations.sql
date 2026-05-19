-- Fix 5 foundation question explanations that were unclear or used jargon.

update public.syllogism_questions
set explanation = 'The premise puts safety briefings inside scheduled meetings. It says nothing about scheduled meetings that are not safety briefings — there might be none at all, meaning the two groups could be identical.'
where trick_type = 'foundation_all_allows_equal_groups';

update public.syllogism_questions
set explanation = 'Most rehearsal rooms are booked spaces, so at least one rehearsal room is also a booked space. That same item can be described from either side: it is a booked space that is a rehearsal room, which is exactly what the conclusion says.'
where trick_type = 'foundation_most_some_reverse';

update public.syllogism_questions
set explanation = 'Picture 10 consent forms and 1,000 scanned records. All 10 consent forms are scanned records, satisfying the premise. But those 10 are a tiny fraction of the 1,000 scanned records, so most scanned records are not consent forms.'
where trick_type = 'foundation_most_converse_trap';

update public.syllogism_questions
set explanation = 'The rule says un-shortlisted applications get archived. This application was not archived, so it must have been shortlisted — that is the only way to avoid being archived under the rule.'
where trick_type = 'foundation_conditional_not_then_contrapositive';

update public.syllogism_questions
set explanation = 'The planning applications that are reviewed documents, and the reviewed documents that are archived files, can be entirely different batches. The planning applications could sit in the un-archived portion of reviewed documents, leaving most of them un-archived.'
where trick_type = 'foundation_most_most_not_guaranteed';
