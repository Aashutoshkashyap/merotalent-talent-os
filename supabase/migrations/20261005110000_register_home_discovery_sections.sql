-- Register real-data homepage rails in the existing Super Admin page editor.
-- Existing section visibility, copy, and ordering are never overwritten.
INSERT INTO public.page_sections (page, section_key, title, subtitle, display_order, is_visible)
VALUES
  ('home', 'colleges_section', 'Explore colleges', 'Approved institutions from the MeroTalent directory.', 5, true),
  ('home', 'mentors_section', 'Meet mentors', 'Approved mentors available to guide your next step.', 8, true),
  ('home', 'events_section', 'Upcoming events', 'Approved events still open to explore.', 9, true),
  ('home', 'courses_section', 'Partner courses', 'Continue learning on the approved partner platform.', 10, true),
  ('home', 'college_updates_section', 'College updates', 'Recent posts and notices from approved institutions.', 11, true)
ON CONFLICT (page, section_key) DO NOTHING;
