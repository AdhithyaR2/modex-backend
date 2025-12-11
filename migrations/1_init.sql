-- ============================================================
--  Migration: Initial Database Schema for Ticket Booking System
--  Author: Your Name
--  Description:
--    Creates core tables: shows, seats, bookings, users.
--    Sets up ENUM types, constraints, indexes, and UUID support.
-- ============================================================

-- ===== Enable Extensions =====
-- Required for gen_random_uuid() to work in PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  ENUM TYPES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
    END IF;
END
$$;

-- ============================================================
--  USERS TABLE (Optional for future auth expandability)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SHOWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    total_seats INT NOT NULL CHECK (total_seats >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to quickly list upcoming shows
CREATE INDEX IF NOT EXISTS idx_shows_start_time ON shows(start_time);

-- ============================================================
--  SEATS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    seat_number TEXT NOT NULL,                  -- e.g., "1", "A1", etc.
    status TEXT NOT NULL DEFAULT 'AVAILABLE',   -- AVAILABLE | BOOKED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (show_id, seat_number)
);

-- Index for fast seat lookup during booking concurrency
CREATE INDEX IF NOT EXISTS idx_seats_show ON seats(show_id);

-- ============================================================
--  BOOKINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    seats UUID[] NOT NULL,                       -- Array of seat IDs
    status booking_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical index: worker uses this to find expired bookings fast
CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
ON bookings(status, created_at);

-- ============================================================
-- END OF MIGRATION
-- ============================================================
