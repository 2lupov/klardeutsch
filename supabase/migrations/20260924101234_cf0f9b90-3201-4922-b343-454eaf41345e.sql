with latest as (
  select distinct on (student_id) student_id, board
  from live_classes
  where student_id is not null
    and jsonb_typeof(board) = 'array'
    and jsonb_array_length(board) > 1
  order by student_id, updated_at desc
)
insert into student_boards (user_id, elements, created_at, updated_at)
select student_id, board, now(), now() from latest
on conflict (user_id) do update
set elements = excluded.elements, updated_at = now()
where student_boards.elements is null
   or jsonb_typeof(student_boards.elements) <> 'array'
   or jsonb_array_length(student_boards.elements) <= 1;