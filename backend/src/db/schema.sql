-- FareWise Zimbabwe Database Schema
-- PostgreSQL via Supabase
-- Run this file once to initialize the database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (base table for riders, drivers, admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  profile_photo_url TEXT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('rider', 'driver', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  emergency_contact VARCHAR(20),
  fcm_token TEXT,
  whatsapp_number VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  vehicle_make VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_year INTEGER,
  vehicle_plate VARCHAR(20) UNIQUE,
  vehicle_color VARCHAR(30),
  vehicle_photo_url TEXT,

  license_number VARCHAR(50),
  license_photo_url TEXT,
  national_id_number VARCHAR(50),
  national_id_photo_url TEXT,
  vehicle_registration_url TEXT,

  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approval_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  is_online BOOLEAN DEFAULT FALSE,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  last_location_update TIMESTAMPTZ,
  heading DECIMAL(5, 2),

  base_fare DECIMAL(10, 2) DEFAULT 2.00,
  per_km_rate DECIMAL(10, 2) DEFAULT 0.50,
  minimum_fare DECIMAL(10, 2) DEFAULT 3.00,
  surge_multiplier DECIMAL(4, 2) DEFAULT 1.00,
  surge_enabled BOOLEAN DEFAULT FALSE,

  total_rides INTEGER DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0.00,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,

  plan_type VARCHAR(20) DEFAULT 'standard' CHECK (plan_type IN ('standard', 'premium')),
  amount_usd DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',

  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'overdue')),

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  payment_method VARCHAR(20) CHECK (payment_method IN ('ecocash', 'onemoney', 'zimswitch', 'visa', 'cash')),
  payment_reference VARCHAR(200),
  paynow_reference VARCHAR(200),

  auto_renew BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  rider_id UUID NOT NULL REFERENCES users(id),
  driver_id UUID REFERENCES drivers(id),
  requested_driver_id UUID REFERENCES drivers(id),

  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,

  distance_km DECIMAL(8, 2),
  estimated_duration_mins INTEGER,
  actual_duration_mins INTEGER,
  route_polyline TEXT,

  estimated_fare_min DECIMAL(10, 2),
  estimated_fare_max DECIMAL(10, 2),
  final_fare DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',

  status VARCHAR(30) DEFAULT 'requesting' CHECK (status IN (
    'requesting', 'matching', 'driver_assigned', 'driver_en_route',
    'arrived', 'in_progress', 'completed', 'cancelled', 'no_driver_found'
  )),

  cancelled_by VARCHAR(10) CHECK (cancelled_by IN ('rider', 'driver', 'system')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,

  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_reference VARCHAR(200),
  paynow_reference VARCHAR(200),

  trip_share_token VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  sos_triggered BOOLEAN DEFAULT FALSE,
  sos_triggered_at TIMESTAMPTZ,

  requested_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  driver_arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID UNIQUE NOT NULL REFERENCES rides(id),
  from_rider_id UUID NOT NULL REFERENCES users(id),
  to_driver_id UUID NOT NULL REFERENCES drivers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OTP
-- ============================================================
CREATE TABLE IF NOT EXISTS otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES rides(id),
  subscription_id UUID REFERENCES subscriptions(id),
  user_id UUID NOT NULL REFERENCES users(id),

  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('ride_fare', 'subscription', 'onboarding_fee')),
  payment_method VARCHAR(20),

  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),

  paynow_hash VARCHAR(1000),
  paynow_poll_url TEXT,
  paynow_reference VARCHAR(200),
  external_reference VARCHAR(200),

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES rides(id),
  raised_by UUID NOT NULL REFERENCES users(id),

  type VARCHAR(30) NOT NULL CHECK (type IN (
    'fare_dispute', 'safety_concern', 'driver_conduct',
    'rider_conduct', 'payment_issue', 'other'
  )),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVER FAVOURITE RIDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_favourite_riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, rider_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50),
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_drivers_approval ON drivers(approval_status);
CREATE INDEX IF NOT EXISTS idx_rides_rider ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_driver ON subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_ride ON disputes(ride_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rides_updated_at BEFORE UPDATE ON rides FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subs_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update driver average rating
CREATE OR REPLACE FUNCTION sync_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers
  SET
    average_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE to_driver_id = NEW.to_driver_id),
    rating_count   = (SELECT COUNT(*) FROM ratings WHERE to_driver_id = NEW.to_driver_id)
  WHERE id = NEW.to_driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_driver_rating
AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW EXECUTE FUNCTION sync_driver_rating();
