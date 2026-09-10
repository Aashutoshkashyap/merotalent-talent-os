-- Make every homepage component explicitly manageable from Super Admin on
-- existing databases. Existing administrator edits are never overwritten.

BEGIN;

INSERT INTO public.page_sections (
  page,
  section_key,
  title,
  subtitle,
  body,
  display_order,
  is_visible
)
VALUES
  (
    'home',
    'hero_banner',
    'Find your next opportunity',
    'Nepal''s talent and opportunity network',
    '',
    1,
    true
  ),
  (
    'home',
    'featured_content',
    'Featured opportunities',
    'Handpicked opportunities from the MeroTalent network.',
    '',
    2,
    true
  ),
  (
    'home',
    'advertisements',
    'Sponsored placements',
    'Current partner promotions and announcements.',
    '',
    3,
    true
  ),
  (
    'home',
    'contact_form',
    'Contact MeroTalent',
    'Get in touch with our support team.',
    '',
    11,
    true
  ),
  (
    'home',
    'cta',
    'Take the next step',
    'Create your MeroTalent account today.',
    '',
    12,
    true
  )
ON CONFLICT (page, section_key) DO NOTHING;

COMMIT;
