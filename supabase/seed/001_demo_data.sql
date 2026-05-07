-- ============================================================
-- Seed: Demo HVAC Contractor — Polar Air Solutions
-- Josh Smith, owner/admin
-- 50 customers, 200 jobs, invoices, price book
-- ============================================================
-- NOTE: Run AFTER creating auth user via Supabase dashboard or API.
-- Replace JOSH_USER_ID with the actual UUID from auth.users.
-- ============================================================

DO $$
DECLARE
  org_id UUID;
  josh_id UUID;
  tech1_id UUID;
  tech2_id UUID;
  pb_id UUID;
  customer_ids UUID[];
  address_ids UUID[];
  item_ids UUID[];
  c_id UUID;
  a_id UUID;
  j_id UUID;
  inv_id UUID;
  i INTEGER;
  sched_date TIMESTAMPTZ;
BEGIN

  -- --------------------------------------------------------
  -- Organization (created by auth trigger on signup)
  -- Update it with full details
  -- --------------------------------------------------------
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'polar-air-solutions';

  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, phone, email, address, city, state, zip, service_area_zips, primary_color, google_review_url, plan_tier)
    VALUES ('Polar Air Solutions', 'polar-air-solutions', '(602) 555-0100', 'josh@polarairsolutions.net', '4820 N 16th St', 'Phoenix', 'AZ', '85016', ARRAY['85001','85002','85003','85004','85006','85007','85008','85009','85012','85013','85014','85015','85016','85017','85018','85019','85020'], '#2563EB', 'https://g.page/r/polar-air-solutions/review', 'professional')
    RETURNING id INTO org_id;
  ELSE
    UPDATE public.organizations SET
      phone = '(602) 555-0100',
      email = 'josh@polarairsolutions.net',
      address = '4820 N 16th St',
      city = 'Phoenix',
      state = 'AZ',
      zip = '85016',
      service_area_zips = ARRAY['85001','85002','85003','85004','85006','85007','85008','85009','85012','85013','85014','85015','85016','85017','85018','85019','85020'],
      google_review_url = 'https://g.page/r/polar-air-solutions/review',
      plan_tier = 'professional'
    WHERE id = org_id;
  END IF;

  -- Get Josh's user ID
  SELECT id INTO josh_id FROM public.users WHERE organization_id = org_id LIMIT 1;

  -- --------------------------------------------------------
  -- Price Book Items
  -- --------------------------------------------------------
  SELECT id INTO pb_id FROM public.price_books WHERE organization_id = org_id LIMIT 1;

  INSERT INTO public.price_book_items (price_book_id, organization_id, name, description, category, unit_price, cost, taxable, sort_order) VALUES
    (pb_id, org_id, 'AC Tune-Up', 'Full system inspection, coil cleaning, refrigerant check', 'maintenance', 129.00, 45.00, FALSE, 1),
    (pb_id, org_id, 'Furnace Tune-Up', 'Heat exchanger inspection, burner cleaning, filter replacement', 'maintenance', 99.00, 35.00, FALSE, 2),
    (pb_id, org_id, 'Freon Recharge (per lb)', 'R-410A refrigerant per pound', 'repair', 75.00, 30.00, TRUE, 10),
    (pb_id, org_id, 'Capacitor Replacement', 'Start or run capacitor replacement', 'repair', 185.00, 40.00, TRUE, 11),
    (pb_id, org_id, 'Contactor Replacement', 'Contactor relay replacement', 'repair', 175.00, 35.00, TRUE, 12),
    (pb_id, org_id, 'Blower Motor Replacement', 'ECM or PSC blower motor replacement', 'repair', 450.00, 180.00, TRUE, 13),
    (pb_id, org_id, 'Condenser Fan Motor', 'Condenser fan motor replacement', 'repair', 380.00, 150.00, TRUE, 14),
    (pb_id, org_id, 'Compressor Replacement', 'AC compressor replacement (parts + labor)', 'repair', 1400.00, 700.00, TRUE, 15),
    (pb_id, org_id, 'Thermostat Installation', 'Smart thermostat installation (Nest/Ecobee)', 'installation', 195.00, 80.00, TRUE, 20),
    (pb_id, org_id, 'Mini Split Installation (1 zone)', 'Ductless mini split install, single zone', 'installation', 2800.00, 1200.00, TRUE, 21),
    (pb_id, org_id, 'New AC System (3-ton)', '3-ton split system installation, includes removal of old unit', 'installation', 5500.00, 2800.00, TRUE, 22),
    (pb_id, org_id, 'Duct Cleaning', 'Full duct system cleaning and sanitization', 'maintenance', 350.00, 100.00, FALSE, 30),
    (pb_id, org_id, 'Air Filter (1-inch)', 'Standard 1-inch MERV-8 filter', 'parts', 18.00, 6.00, TRUE, 40),
    (pb_id, org_id, 'Air Filter (4-inch)', 'High-efficiency 4-inch media filter', 'parts', 45.00, 18.00, TRUE, 41),
    (pb_id, org_id, 'Diagnostic Fee', 'System diagnostic and troubleshooting', 'repair', 89.00, 0.00, FALSE, 5),
    (pb_id, org_id, 'Emergency Service', 'After-hours/weekend emergency call premium', 'repair', 149.00, 0.00, FALSE, 6)
  RETURNING id INTO item_ids;

  SELECT ARRAY(SELECT id FROM public.price_book_items WHERE organization_id = org_id) INTO item_ids;

  -- --------------------------------------------------------
  -- 50 Customers with addresses
  -- --------------------------------------------------------
  customer_ids := ARRAY[]::UUID[];
  address_ids := ARRAY[]::UUID[];

  -- Customer 1
  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Robert', 'Martinez', 'rmartinez@email.com', '6025550101') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '1234 W Camelback Rd', 'Phoenix', 'AZ', '85013', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Linda', 'Thompson', 'lthompson@email.com', '6025550102') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '5678 E McDowell Rd', 'Phoenix', 'AZ', '85008', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'David', 'Johnson', 'djohnson@gmail.com', '6025550103') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '910 N Central Ave', 'Phoenix', 'AZ', '85004', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Susan', 'Williams', 'swilliams@yahoo.com', '6025550104') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '2468 W Thomas Rd', 'Phoenix', 'AZ', '85015', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Michael', 'Brown', 'mbrown@outlook.com', '6025550105') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '3691 E Indian School Rd', 'Phoenix', 'AZ', '85018', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Patricia', 'Davis', 'pdavis@email.com', '6025550106') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '7823 N 7th St', 'Phoenix', 'AZ', '85020', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'James', 'Miller', 'jmiller@gmail.com', '6025550107') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '456 W Bethany Home Rd', 'Phoenix', 'AZ', '85013', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Barbara', 'Wilson', 'bwilson@icloud.com', '6025550108') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '1357 E Osborn Rd', 'Phoenix', 'AZ', '85014', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Charles', 'Moore', 'cmoore@email.com', '6025550109') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '2019 W Northern Ave', 'Phoenix', 'AZ', '85021', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  INSERT INTO customers (organization_id, first_name, last_name, email, phone) VALUES (org_id, 'Jennifer', 'Taylor', 'jtaylor@gmail.com', '6025550110') RETURNING id INTO c_id;
  customer_ids := customer_ids || c_id;
  INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary) VALUES (c_id, org_id, '888 E Thunderbird Rd', 'Phoenix', 'AZ', '85022', TRUE) RETURNING id INTO a_id;
  address_ids := address_ids || a_id;

  -- Customers 11-50 (bulk insert for brevity)
  FOR i IN 11..50 LOOP
    INSERT INTO customers (organization_id, first_name, last_name, email, phone)
    VALUES (
      org_id,
      (ARRAY['John','Mary','William','Elizabeth','Richard','Dorothy','Thomas','Betty','Christopher','Margaret','Daniel','Sandra','Paul','Ashley','Mark','Sarah','Donald','Nancy','George','Lisa'])[((i-11) % 20) + 1],
      (ARRAY['Anderson','Jackson','White','Harris','Martin','Thompson','Garcia','Robinson','Clark','Rodriguez','Lewis','Lee','Walker','Hall','Allen','Young','Hernandez','King','Wright','Lopez'])[((i-11) % 20) + 1],
      'customer' || i || '@demo.com',
      '602555' || LPAD(i::TEXT, 4, '0')
    ) RETURNING id INTO c_id;
    customer_ids := customer_ids || c_id;

    INSERT INTO customer_addresses (customer_id, organization_id, street, city, state, zip, is_primary)
    VALUES (
      c_id, org_id,
      (i * 123 + 100)::TEXT || ' ' || (ARRAY['N','S','E','W'])[i % 4 + 1] || ' ' ||
      (ARRAY['Oak','Maple','Pine','Cedar','Elm','Birch','Walnut','Cherry','Willow','Ash'])[i % 10 + 1] || ' St',
      (ARRAY['Phoenix','Scottsdale','Tempe','Chandler','Mesa','Glendale','Peoria','Surprise'])[i % 8 + 1],
      'AZ',
      (ARRAY['85001','85008','85012','85016','85018','85020','85251','85281'])[i % 8 + 1],
      TRUE
    ) RETURNING id INTO a_id;
    address_ids := address_ids || a_id;
  END LOOP;

  -- --------------------------------------------------------
  -- 200 Jobs (mix of statuses, spread over past 6 months + future)
  -- --------------------------------------------------------
  FOR i IN 1..200 LOOP
    sched_date := NOW() - INTERVAL '6 months' + (i * INTERVAL '21 hours');

    INSERT INTO jobs (
      organization_id, customer_id, address_id, technician_id, status,
      scheduled_start, scheduled_end, actual_start, actual_end, title
    ) VALUES (
      org_id,
      customer_ids[(i % array_length(customer_ids, 1)) + 1],
      address_ids[(i % array_length(address_ids, 1)) + 1],
      CASE WHEN i % 5 = 0 THEN NULL ELSE josh_id END,
      CASE
        WHEN sched_date < NOW() - INTERVAL '1 day' AND i % 10 != 0 THEN 'completed'
        WHEN sched_date < NOW() - INTERVAL '1 day' AND i % 10 = 0 THEN 'cancelled'
        WHEN sched_date < NOW() THEN 'in_progress'
        WHEN sched_date < NOW() + INTERVAL '2 hours' THEN 'dispatched'
        ELSE 'scheduled'
      END,
      sched_date,
      sched_date + INTERVAL '2 hours',
      CASE WHEN sched_date < NOW() THEN sched_date + INTERVAL '15 minutes' ELSE NULL END,
      CASE WHEN sched_date < NOW() - INTERVAL '1 day' AND i % 10 != 0 THEN sched_date + INTERVAL '1 hour 45 minutes' ELSE NULL END,
      (ARRAY[
        'AC Tune-Up', 'Furnace Tune-Up', 'Capacitor Replacement', 'Freon Recharge',
        'Thermostat Installation', 'Blower Motor Replacement', 'Diagnostic Service',
        'Duct Cleaning', 'AC Not Cooling', 'No Heat', 'System Not Starting',
        'Strange Noise Inspection', 'Annual Maintenance', 'New Filter Install',
        'Condenser Fan Repair', 'Emergency Service Call'
      ])[i % 16 + 1]
    ) RETURNING id INTO j_id;

    -- Add line items to completed jobs
    IF (SELECT status FROM jobs WHERE id = j_id) = 'completed' THEN
      INSERT INTO job_line_items (job_id, organization_id, price_book_item_id, name, quantity, unit_price, taxable)
      SELECT j_id, org_id, item_ids[1 + (i % array_length(item_ids, 1))],
             pbi.name, 1, pbi.unit_price, pbi.taxable
      FROM price_book_items pbi
      WHERE pbi.id = item_ids[1 + (i % array_length(item_ids, 1))];

      -- Create invoice for completed jobs
      INSERT INTO invoices (
        organization_id, customer_id, job_id, status, invoice_number, title,
        subtotal, tax_rate, tax_amount, total, amount_paid, due_date,
        sent_at, paid_at, created_by
      )
      SELECT
        org_id,
        jobs.customer_id,
        j_id,
        CASE WHEN i % 8 = 0 THEN 'overdue' WHEN i % 4 = 0 THEN 'sent' ELSE 'paid' END,
        'INV-' || LPAD(i::TEXT, 5, '0'),
        jobs.title,
        jli.unit_price,
        0.087,
        ROUND(jli.unit_price * 0.087, 2),
        jli.unit_price + ROUND(jli.unit_price * 0.087, 2),
        CASE WHEN i % 4 != 0 THEN jli.unit_price + ROUND(jli.unit_price * 0.087, 2) ELSE 0 END,
        (SELECT scheduled_start::DATE + 30 FROM jobs WHERE id = j_id),
        (SELECT scheduled_end FROM jobs WHERE id = j_id),
        CASE WHEN i % 4 != 0 THEN (SELECT scheduled_end + INTERVAL '2 days' FROM jobs WHERE id = j_id) ELSE NULL END,
        josh_id
      FROM jobs
      JOIN job_line_items jli ON jli.job_id = jobs.id
      WHERE jobs.id = j_id
      LIMIT 1
      RETURNING id INTO inv_id;

      -- Record payment for paid invoices
      IF (SELECT status FROM invoices WHERE id = inv_id) = 'paid' THEN
        INSERT INTO payments (organization_id, invoice_id, amount, method, status, collected_by)
        SELECT org_id, inv_id, total, 'credit_card', 'succeeded', josh_id
        FROM invoices WHERE id = inv_id;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Seed complete. Organization ID: %', org_id;
END;
$$;
