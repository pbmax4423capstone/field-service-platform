-- ============================================================
-- Migration 003: Auth Setup
-- Handles org creation on signup, user profile sync
-- ============================================================

-- Function: called on new user signup via auth trigger
-- Creates organization + user profile + admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  business_name TEXT;
  slug_candidate TEXT;
  slug_final TEXT;
  counter INTEGER := 0;
BEGIN
  business_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate unique slug
  slug_candidate := regexp_replace(lower(business_name), '[^a-z0-9]+', '-', 'g');
  slug_candidate := trim(both '-' from slug_candidate);
  slug_final := slug_candidate;

  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = slug_final) LOOP
    counter := counter + 1;
    slug_final := slug_candidate || '-' || counter;
  END LOOP;

  -- Create the organization
  INSERT INTO public.organizations (name, slug)
  VALUES (business_name, slug_final)
  RETURNING id INTO new_org_id;

  -- Create user profile
  INSERT INTO public.users (id, organization_id, email, full_name)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'admin');

  -- Create default price book
  INSERT INTO public.price_books (organization_id, name, description)
  VALUES (new_org_id, 'Default Price Book', 'Standard HVAC services and parts');

  -- Create default notification preferences
  INSERT INTO public.notification_preferences (organization_id, event, channel, is_enabled, reminder_offset_minutes, template_sms, template_email_subject)
  VALUES
    (new_org_id, 'appointment_reminder_24h', 'both', TRUE, 1440,
     'Hi {{customer_name}}, reminder: you have an HVAC appointment tomorrow at {{time}}. Reply STOP to opt out.',
     'Appointment Reminder — Tomorrow at {{time}}'),
    (new_org_id, 'appointment_reminder_2h', 'both', TRUE, 120,
     'Hi {{customer_name}}, your HVAC technician will arrive in about 2 hours. Track at {{link}}.',
     'Your Technician Arrives Soon'),
    (new_org_id, 'technician_en_route', 'sms', TRUE, NULL,
     'Your {{org_name}} technician is on the way! ETA: {{eta}}. Reply STOP to opt out.',
     'Your Technician Is On The Way'),
    (new_org_id, 'job_completed', 'email', TRUE, NULL,
     NULL,
     'Your Service Is Complete — {{org_name}}'),
    (new_org_id, 'invoice_sent', 'email', TRUE, NULL,
     NULL,
     'Invoice #{{invoice_number}} from {{org_name}} — ${{total}} due'),
    (new_org_id, 'review_request', 'both', TRUE, 120,
     'Thanks for choosing {{org_name}}! Mind leaving us a quick review? {{review_url}}',
     'How Did We Do? Leave a Review'),
    (new_org_id, 'booking_confirmed', 'both', TRUE, NULL,
     'Your booking with {{org_name}} is confirmed for {{date}}. We''ll follow up shortly.',
     'Booking Confirmed — {{org_name}}');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires when a new user signs up via Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Invite technician function
-- Called by admin to add a technician to their org
-- ============================================================

CREATE OR REPLACE FUNCTION public.invite_technician(
  invite_email TEXT,
  invite_full_name TEXT,
  invite_role user_role DEFAULT 'technician'
)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
  invited_user_id UUID;
BEGIN
  org_id := auth.organization_id();

  -- Ensure caller is admin
  IF NOT auth.has_role('admin') THEN
    RAISE EXCEPTION 'Only admins can invite technicians';
  END IF;

  -- Check if user already exists
  SELECT id INTO invited_user_id FROM auth.users WHERE email = invite_email;

  IF invited_user_id IS NOT NULL THEN
    -- User exists — add them to this org if not already there
    INSERT INTO public.users (id, organization_id, email, full_name)
    VALUES (invited_user_id, org_id, invite_email, invite_full_name)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (invited_user_id, org_id, invite_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN invited_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
