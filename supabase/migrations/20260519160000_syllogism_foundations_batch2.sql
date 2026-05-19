-- 20 additional foundation syllogism questions (batch 2).
-- Idempotent: deletes any rows seeded by this script before re-inserting.

delete from public.syllogism_questions
where question_mode = 'foundation'
  and trick_type in (
    'foundation_some_not_no_reverse',
    'foundation_some_not_allows_some',
    'foundation_some_not_is_not_no',
    'foundation_all_all_chain',
    'foundation_all_all_chain_converse_trap',
    'foundation_no_some_chain',
    'foundation_some_some_weak_chain',
    'foundation_conditional_hypothetical_syllogism',
    'foundation_conditional_not_then_contrapositive',
    'foundation_conditional_shared_antecedent_trap',
    'foundation_all_no_some_not',
    'foundation_most_all_some_reverse',
    'foundation_no_no_no_trap',
    'foundation_some_all_some_chain',
    'foundation_all_some_not_no_chain',
    'foundation_most_no_most_not',
    'foundation_most_most_not_guaranteed',
    'foundation_most_allows_all',
    'foundation_inclusive_or_allows_both',
    'foundation_inclusive_or_not_exclusive'
  );

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

  -- ── "Some are not" quantifier (3) ──────────────────────────────────────────

  (
    null,
    'foundation',
    'Some laboratory assistants are not qualified supervisors.',
    'Some qualified supervisors are not laboratory assistants.',
    false,
    'relative',
    'foundation_some_not_no_reverse',
    'The premise only tells us that a portion of laboratory assistants fall outside the qualified-supervisor group. It says nothing about the composition of the qualified-supervisor group itself; there could be qualified supervisors who are also laboratory assistants.',
    '"Some are not" does not reverse',
    'Some A are not B does not prove that some B are not A.'
  ),

  (
    null,
    'foundation',
    'Some research volunteers are not paid participants.',
    'It is possible that some research volunteers are paid participants.',
    true,
    'relative',
    'foundation_some_not_allows_some',
    'The premise confirms that a portion of volunteers are unpaid. It says nothing about the remaining volunteers, so others could well be paid participants.',
    '"Some are not" leaves the rest open',
    'Some A are not B allows, but does not prove, that some A are B.'
  ),

  (
    null,
    'foundation',
    'Some overnight shifts are not senior-staffed.',
    'No overnight shifts are senior-staffed.',
    false,
    'relative',
    'foundation_some_not_is_not_no',
    'The premise tells us only that some overnight shifts lack senior staff. It leaves open the possibility that other overnight shifts are senior-staffed; it does not eliminate all such cases.',
    '"Some are not" is not "none are"',
    'Some A are not B does not prove that no A are B.'
  ),

  -- ── Transitive chains (2) ──────────────────────────────────────────────────

  (
    null,
    'foundation',
    'All student volunteers are registered members. All registered members are insured participants.',
    'All student volunteers are insured participants.',
    true,
    'complex',
    'foundation_all_all_chain',
    'Student volunteers sit entirely inside the registered-member group, which sits entirely inside the insured-participant group. Following the chain, every student volunteer must be an insured participant.',
    'All plus all chains forward',
    'If all A are B and all B are C, then all A are C.'
  ),

  (
    null,
    'foundation',
    'All junior analysts are salaried employees. All salaried employees are payroll-registered staff.',
    'All payroll-registered staff are junior analysts.',
    false,
    'complex',
    'foundation_all_all_chain_converse_trap',
    'The chain places junior analysts inside salaried employees, which sit inside payroll-registered staff. Payroll-registered staff is the outermost group and almost certainly contains many people who are not junior analysts.',
    'A chain does not reverse',
    'All A are B and all B are C does not prove that all C are A.'
  ),

  -- ── No + Some chain (1) ────────────────────────────────────────────────────

  (
    null,
    'foundation',
    'No completed forms are rejected submissions. Some intake files are completed forms.',
    'Some intake files are not rejected submissions.',
    true,
    'complex',
    'foundation_no_some_chain',
    'The intake files that are completed forms cannot be rejected submissions, because the first premise rules out any overlap between completed forms and rejected submissions. Those intake files are therefore guaranteed to sit outside the rejected-submission group.',
    'No plus some creates some-not',
    'If no A are B and some C are A, then some C are not B.'
  ),

  -- ── Some + Some weak chain (1) ────────────────────────────────────────────

  (
    null,
    'foundation',
    'Some duty rosters are colour-coded charts. Some colour-coded charts are digital dashboards.',
    'Some duty rosters are digital dashboards.',
    false,
    'complex',
    'foundation_some_some_weak_chain',
    'The colour-coded charts that are digital dashboards may be entirely different items from those that are duty rosters. The two "some" statements can describe non-overlapping subsets of colour-coded charts, so no duty roster need be a digital dashboard.',
    'Some plus some breaks the chain',
    'Some A are B and some B are C does not prove that some A are C.'
  ),

  -- ── Conditional rules (3) ─────────────────────────────────────────────────

  (
    null,
    'foundation',
    'If a submission is late, then it is flagged for review. If a submission is flagged for review, then it requires supervisor approval.',
    'If a submission is late, it requires supervisor approval.',
    true,
    'complex',
    'foundation_conditional_hypothetical_syllogism',
    'The two rules form an unbroken if-then chain: being late leads to being flagged, and being flagged leads to requiring supervisor approval. Following the chain from the first condition to the final result is valid.',
    'If-then chains link forward',
    'If A then B, and if B then C, then if A then C.'
  ),

  (
    null,
    'foundation',
    'If an application is not shortlisted, it is archived. This application is not archived.',
    'This application was shortlisted.',
    true,
    'complex',
    'foundation_conditional_not_then_contrapositive',
    'Taking the contrapositive of the rule: if not archived, then shortlisted. This application is not archived, so the contrapositive fires directly and the application must be shortlisted.',
    'Contrapositive of a negated-antecedent rule',
    'If not A then B, and B is false, then A must be true.'
  ),

  (
    null,
    'foundation',
    'If a patient is admitted, their records are updated. If a patient is admitted, a bed is assigned.',
    'If a patient''s records are updated, a bed is assigned.',
    false,
    'complex',
    'foundation_conditional_shared_antecedent_trap',
    'Both consequences share the same cause, but neither causes the other. Records being updated does not itself trigger bed assignment; only admission does. The two effects are independent results of admission.',
    'Shared cause does not link effects',
    'If A then B, and if A then C, does not prove that if B then C.'
  ),

  -- ── Mixed-quantifier chains (4) ───────────────────────────────────────────

  (
    null,
    'foundation',
    'All audit reports are board documents. No audit reports are confidential files.',
    'Some board documents are not confidential files.',
    true,
    'complex',
    'foundation_all_no_some_not',
    'The audit reports are all board documents and none are confidential files. The board documents that are audit reports must therefore sit outside the confidential-file group, giving at least one board document that is not confidential.',
    'All plus no produces some-not',
    'If all A are B and no A are C, then some B are not C.'
  ),

  (
    null,
    'foundation',
    'Some mentor sessions are recorded. All mentor sessions are scheduled appointments.',
    'Some scheduled appointments are recorded.',
    true,
    'complex',
    'foundation_some_all_some_chain',
    'The mentor sessions that are recorded are also, by the second premise, scheduled appointments. That gives at least one scheduled appointment which is recorded.',
    'Some plus all produces overlap',
    'If some A are B and all A are C, then some C are B.'
  ),

  (
    null,
    'foundation',
    'All archive boxes are labelled containers. Some labelled containers are not accessible to visitors.',
    'Some archive boxes are not accessible to visitors.',
    false,
    'complex',
    'foundation_all_some_not_no_chain',
    'The labelled containers that are inaccessible may be entirely outside the archive-box group. Because labelled containers can be a larger set than archive boxes, the restricted items need not include any archive box at all.',
    'A in B does not inherit B''s exceptions',
    'All A are B and some B are not C does not prove that some A are not C.'
  ),

  (
    null,
    'foundation',
    'No induction days are assessed events. No assessed events are social activities.',
    'No induction days are social activities.',
    false,
    'categorical',
    'foundation_no_no_no_trap',
    'The two premises share no information about whether induction days and social activities overlap. The middle term, assessed events, sits between them but establishes no link between induction days and social activities.',
    'No plus no does not chain',
    'No A are B and no B are C does not prove that no A are C.'
  ),

  -- ── Most extended (4) ─────────────────────────────────────────────────────

  (
    null,
    'foundation',
    'Most apprentices are shift workers. All apprentices are registered trainees.',
    'Some registered trainees are shift workers.',
    true,
    'majority',
    'foundation_most_all_some_reverse',
    'The apprentices who are shift workers are also registered trainees (by the second premise). That overlap guarantees at least one registered trainee who is a shift worker.',
    'Most plus all produces some overlap',
    'If most A are B and all A are C, then some C are B.'
  ),

  (
    null,
    'foundation',
    'Most council reports are public records. No public records are restricted documents.',
    'Most council reports are not restricted documents.',
    true,
    'majority',
    'foundation_most_no_most_not',
    'The majority of council reports are public records, and no public record can be a restricted document. That majority portion of council reports is therefore guaranteed to sit outside the restricted-document group, making it true that most council reports are not restricted documents.',
    'Most in a no-zone means most excluded',
    'If most A are B and no B are C, then most A are not C.'
  ),

  (
    null,
    'foundation',
    'Most planning applications are reviewed documents. Most reviewed documents are archived files.',
    'Most planning applications are archived files.',
    false,
    'majority',
    'foundation_most_most_not_guaranteed',
    'If each majority is just above 50%, the planning applications that are reviewed documents and the reviewed documents that are archived files need not be the same items. The combined overlap reaching planning applications could fall below 50%, so most planning applications being archived files is not guaranteed.',
    'Most plus most is not most',
    'Most A are B and most B are C does not guarantee that most A are C.'
  ),

  (
    null,
    'foundation',
    'Most conference papers are peer-reviewed.',
    'It is possible that all conference papers are peer-reviewed.',
    true,
    'majority',
    'foundation_most_allows_all',
    'Most means more than half. It does not rule out every single paper being peer-reviewed; that scenario is entirely consistent with the premise.',
    'Most allows all',
    'Most A are B is compatible with all A being B.'
  ),

  -- ── Inclusive or (2) ──────────────────────────────────────────────────────

  (
    null,
    'foundation',
    'Every project proposal must contain either a budget summary or a timeline, or both.',
    'A project proposal that contains a budget summary can also contain a timeline.',
    true,
    'complex',
    'foundation_inclusive_or_allows_both',
    'The phrase "or both" explicitly makes this an inclusive or. Having both options simultaneously satisfies the premise and is therefore possible.',
    'Inclusive or permits both',
    'A or B (inclusive) means having both is allowed.'
  ),

  (
    null,
    'foundation',
    'Every team meeting is either recorded or minuted, or possibly both.',
    'A team meeting that is recorded cannot also be minuted.',
    false,
    'complex',
    'foundation_inclusive_or_not_exclusive',
    'The premise uses an inclusive or. A meeting can satisfy the condition by being recorded, by being minuted, or by being both. Being recorded does not exclude also being minuted.',
    'Inclusive or is not exclusive',
    'If A or B (inclusive), then A being true does not force B to be false.'
  );
