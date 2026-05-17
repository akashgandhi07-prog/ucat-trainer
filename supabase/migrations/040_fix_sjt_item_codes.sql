-- Remove internal item ID codes leaked into whyNotAdjacent explanation text.

update public.sjt_questions
set items = (
  select jsonb_agg(
    case
      when item->>'id' = 'app-003-a' then
        item || jsonb_build_object('whyNotAdjacent',
          replace(item->>'whyNotAdjacent', 'declining (app-003-b)', 'declining the gift'))
      when item->>'id' = 'app-018-c' then
        item || jsonb_build_object('whyNotAdjacent',
          replace(item->>'whyNotAdjacent', 'disclosing limits and seeking supervision (app-018-a)', 'disclosing her limits and seeking supervision'))
      when item->>'id' = 'app-021-a' then
        item || jsonb_build_object('whyNotAdjacent',
          replace(item->>'whyNotAdjacent',
            'respecting a capacitous patient''s wish to delay, once risks are understood (app-021-c)',
            'respecting a capacitous patient''s wish to delay once risks are understood'))
      else item
    end
  )
  from jsonb_array_elements(items) as item
)
where id in ('app-003', 'app-018', 'app-021');
