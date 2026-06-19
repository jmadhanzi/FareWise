-- FareWise seed data for development/testing
-- DO NOT run in production

-- Admin user
INSERT INTO users (id, phone, full_name, role, is_active, is_verified) VALUES
  ('00000000-0000-0000-0000-000000000001', '+263771000001', 'FareWise Admin', 'admin', TRUE, TRUE)
ON CONFLICT (phone) DO NOTHING;

-- Test riders
INSERT INTO users (id, phone, full_name, role, is_active, is_verified) VALUES
  ('00000000-0000-0000-0000-000000000002', '+263771000002', 'Chiedza Moyo', 'rider', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000003', '+263771000003', 'Tatenda Ncube', 'rider', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000004', '+263771000004', 'Rudo Chirwa', 'rider', TRUE, TRUE)
ON CONFLICT (phone) DO NOTHING;

-- Test drivers
INSERT INTO users (id, phone, full_name, role, is_active, is_verified) VALUES
  ('00000000-0000-0000-0000-000000000010', '+263771000010', 'Takudzwa Mutasa', 'driver', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000011', '+263771000011', 'Blessing Sibanda', 'driver', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000012', '+263771000012', 'Farai Mhishi', 'driver', TRUE, TRUE)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO drivers (id, user_id, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color, approval_status, base_fare, per_km_rate, minimum_fare, average_rating, rating_count) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Toyota', 'Corolla', 2019, 'ABB1234', 'Silver', 'approved', 2.00, 0.50, 3.00, 4.8, 127),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'Honda', 'Fit', 2020, 'ACC5678', 'White', 'approved', 1.80, 0.45, 2.50, 4.9, 89),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012', 'Mazda', 'Demio', 2018, 'ADB9012', 'Blue', 'pending', 2.00, 0.50, 3.00, 0.00, 0)
ON CONFLICT (user_id) DO NOTHING;

-- Active subscriptions
INSERT INTO subscriptions (driver_id, plan_type, amount_usd, status, start_date, end_date, payment_method) VALUES
  ('00000000-0000-0000-0000-000000000020', 'standard', 20.00, 'active', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 'ecocash'),
  ('00000000-0000-0000-0000-000000000021', 'premium', 35.00, 'active', CURRENT_DATE - '5 days'::INTERVAL, CURRENT_DATE + '25 days'::INTERVAL, 'onemoney')
ON CONFLICT DO NOTHING;
