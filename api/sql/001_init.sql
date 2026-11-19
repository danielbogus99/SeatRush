CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,

    starts_at TIMESTAMPTZ NOT NULL,
    on_sale_at TIMESTAMPTZ NOT NULL,

    row_count INTEGER NOT NULL CHECK (row_count > 0),
    seats_per_row INTEGER NOT NULL CHECK (seats_per_row > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL REFERENCES events(id),

    name VARCHAR(100) NOT NULL,
    price_agorot INTEGER NOT NULL CHECK (price_agorot >= 0),

    start_row VARCHAR(10) NOT NULL,
    end_row VARCHAR(10) NOT NULL,

    UNIQUE (event_id, name),
    UNIQUE (event_id, id)

);

CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL REFERENCES events(id),
    zone_id UUID NOT NULL,

    row_label VARCHAR(10) NOT NULL,
    seat_number INTEGER NOT NULL CHECK (seat_number > 0),

    UNIQUE (event_id, row_label, seat_number),
    UNIQUE (event_id, id),

    FOREIGN KEY (event_id, zone_id)
        REFERENCES zones(event_id, id)
);

CREATE TABLE IF NOT EXISTS fans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(100) NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL REFERENCES events(id),
    fan_id UUID NOT NULL REFERENCES fans(id),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'RELEASED', 'COMPLETED')),

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, event_id),
    UNIQUE (id, fan_id)
);

CREATE TABLE IF NOT EXISTS hold_seats (
    hold_id UUID NOT NULL,
    seat_id UUID NOT NULL,
    event_id UUID NOT NULL,

    PRIMARY KEY (hold_id, seat_id),

    FOREIGN KEY (hold_id, event_id)
        REFERENCES holds(id, event_id),

    FOREIGN KEY (event_id, seat_id)
        REFERENCES seats(event_id, id)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    hold_id UUID NOT NULL UNIQUE,
    fan_id UUID NOT NULL REFERENCES fans(id),

    total_agorot INTEGER NOT NULL CHECK (total_agorot >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (hold_id, fan_id)
        REFERENCES holds(id, fan_id)
);


-- Demo event for fresh installations
-- The event is already on sale when Docker starts.

DO $$
DECLARE
    demo_event_id UUID;
    vip_zone_id UUID;
    regular_zone_id UUID;
    row_num INTEGER;
    seat_num INTEGER;
    current_row VARCHAR(10);
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM events
        WHERE name = 'SeatRush Demo Concert'
    ) THEN

        INSERT INTO events (
            name,
            venue,
            starts_at,
            on_sale_at,
            row_count,
            seats_per_row
        )
        VALUES (
            'SeatRush Demo Concert',
            'Demo Arena',
            NOW() + INTERVAL '30 days',
            NOW() - INTERVAL '1 day',
            6,
            10
        )
        RETURNING id INTO demo_event_id;

        INSERT INTO zones (
            event_id,
            name,
            price_agorot,
            start_row,
            end_row
        )
        VALUES (
            demo_event_id,
            'VIP',
            25000,
            'A',
            'B'
        )
        RETURNING id INTO vip_zone_id;

        INSERT INTO zones (
            event_id,
            name,
            price_agorot,
            start_row,
            end_row
        )
        VALUES (
            demo_event_id,
            'Regular',
            10000,
            'C',
            'F'
        )
        RETURNING id INTO regular_zone_id;

        FOR row_num IN 1..6 LOOP
            current_row := CHR(64 + row_num);

            FOR seat_num IN 1..10 LOOP
                INSERT INTO seats (
                    event_id,
                    zone_id,
                    row_label,
                    seat_number
                )
                VALUES (
                    demo_event_id,
                    CASE
                        WHEN row_num <= 2 THEN vip_zone_id
                        ELSE regular_zone_id
                    END,
                    current_row,
                    seat_num
                );
            END LOOP;
        END LOOP;

    END IF;
END $$;

