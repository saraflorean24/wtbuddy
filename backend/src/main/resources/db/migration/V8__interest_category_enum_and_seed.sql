-- Enforce category as enum values
ALTER TABLE interest ALTER COLUMN category TYPE VARCHAR(50);

ALTER TABLE interest
    ADD CONSTRAINT interest_category_check
    CHECK (category IN (
        'OUTDOOR','SPORTS','FOOD_DRINK','ARTS','MUSIC',
        'TRAVEL','GAMING','SOCIAL','FITNESS','OTHER'
    ));

-- ── OUTDOOR ──────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Hiking',        'OUTDOOR'),
    ('Camping',       'OUTDOOR'),
    ('Rock Climbing', 'OUTDOOR'),
    ('Kayaking',      'OUTDOOR'),
    ('Fishing',       'OUTDOOR'),
    ('Bird Watching', 'OUTDOOR')
ON CONFLICT (name) DO NOTHING;

-- ── SPORTS ───────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Soccer',     'SPORTS'),
    ('Basketball', 'SPORTS'),
    ('Tennis',     'SPORTS'),
    ('Volleyball', 'SPORTS'),
    ('Swimming',   'SPORTS'),
    ('Cycling',    'SPORTS')
ON CONFLICT (name) DO NOTHING;

-- ── FOOD_DRINK ────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Cooking',          'FOOD_DRINK'),
    ('Baking',           'FOOD_DRINK'),
    ('Wine Tasting',     'FOOD_DRINK'),
    ('Coffee',           'FOOD_DRINK'),
    ('Trying Local Food','FOOD_DRINK'),
    ('Cocktails',        'FOOD_DRINK')
ON CONFLICT (name) DO NOTHING;

-- ── ARTS ─────────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Photography', 'ARTS'),
    ('Painting',    'ARTS'),
    ('Drawing',     'ARTS'),
    ('Crafts',      'ARTS'),
    ('Theater',     'ARTS'),
    ('Pottery',     'ARTS')
ON CONFLICT (name) DO NOTHING;

-- ── MUSIC ────────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Live Concerts',    'MUSIC'),
    ('Guitar',           'MUSIC'),
    ('Piano',            'MUSIC'),
    ('DJing',            'MUSIC'),
    ('Singing',          'MUSIC'),
    ('Music Festivals',  'MUSIC')
ON CONFLICT (name) DO NOTHING;

-- ── TRAVEL ───────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Road Trips',       'TRAVEL'),
    ('Backpacking',      'TRAVEL'),
    ('Beach Trips',      'TRAVEL'),
    ('City Exploring',   'TRAVEL'),
    ('Cultural Tourism', 'TRAVEL'),
    ('Theme Parks',      'TRAVEL')
ON CONFLICT (name) DO NOTHING;

-- ── GAMING ───────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Video Games',   'GAMING'),
    ('Board Games',   'GAMING'),
    ('Card Games',    'GAMING'),
    ('Esports',       'GAMING'),
    ('Tabletop RPGs', 'GAMING'),
    ('Puzzles',       'GAMING')
ON CONFLICT (name) DO NOTHING;

-- ── SOCIAL ───────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Parties',       'SOCIAL'),
    ('Karaoke',       'SOCIAL'),
    ('Trivia Nights', 'SOCIAL'),
    ('Dancing',       'SOCIAL'),
    ('Meetups',       'SOCIAL'),
    ('Escape Rooms',  'SOCIAL')
ON CONFLICT (name) DO NOTHING;

-- ── FITNESS ──────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Gym',          'FITNESS'),
    ('Yoga',         'FITNESS'),
    ('Running',      'FITNESS'),
    ('CrossFit',     'FITNESS'),
    ('Martial Arts', 'FITNESS'),
    ('Pilates',      'FITNESS')
ON CONFLICT (name) DO NOTHING;

-- ── OTHER ─────────────────────────────────────────────────────────────────────
INSERT INTO interest (name, category) VALUES
    ('Reading',      'OTHER'),
    ('Podcasts',     'OTHER'),
    ('Movies',       'OTHER'),
    ('Journaling',   'OTHER'),
    ('Volunteering', 'OTHER'),
    ('Meditation',   'OTHER')
ON CONFLICT (name) DO NOTHING;
