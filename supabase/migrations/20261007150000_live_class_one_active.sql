-- Один активний живий урок на пару вчитель–учень (захист від подвійного кліку / двох вкладок).
-- Старі дублі (якщо були б) спершу закриваємо, лишаючи найновіший.
update public.live_classes lc
set status = 'ended', ended_at = coalesce(ended_at, now())
where status = 'active'
  and exists (
    select 1 from public.live_classes n
    where n.teacher_id = lc.teacher_id and n.student_id = lc.student_id
      and n.status = 'active' and n.created_at > lc.created_at
  );

create unique index if not exists live_classes_one_active_per_pair
  on public.live_classes (teacher_id, student_id)
  where status = 'active';
