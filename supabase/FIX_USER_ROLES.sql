-- Run this AFTER migrations if users were created before role trigger existed.
-- Assigns correct role to each login email.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
  CASE lower(u.email)
    WHEN 'banegabrand.owner@gmail.com' THEN 'owner'::app_role
    WHEN 'banegabrand.admin@gmail.com' THEN 'admin'::app_role
    WHEN 'banegabrand.hr@gmail.com' THEN 'hr_manager'::app_role
    WHEN 'banegabrand.tl@gmail.com' THEN 'tl'::app_role
    WHEN 'banegabrand.manager@gmail.com' THEN 'tl'::app_role
    WHEN 'owner@gmail.com' THEN 'owner'::app_role
    WHEN 'admin@gmail.com' THEN 'admin'::app_role
    WHEN 'hr@gmail.com' THEN 'hr_manager'::app_role
    WHEN 'tl@gmail.com' THEN 'tl'::app_role
    WHEN 'manager@gmail.com' THEN 'tl'::app_role
    ELSE 'employee'::app_role
  END
FROM auth.users u
WHERE lower(u.email) LIKE 'banegabrand.%@gmail.com'
   OR lower(u.email) IN (
     'owner@gmail.com', 'admin@gmail.com', 'hr@gmail.com', 'tl@gmail.com', 'manager@gmail.com'
   )
ON CONFLICT (user_id, role) DO NOTHING;
