-- Remove duplicate match suggestions, keeping the earliest one per (user_id, suggested_user_id) pair
DELETE FROM match_suggestion
WHERE id NOT IN (
    SELECT MIN(id)
    FROM match_suggestion
    GROUP BY user_id, suggested_user_id
);

-- Drop and recreate the unique constraint to ensure it exists
-- (Hibernate ddl-auto may have created the table without it)
ALTER TABLE match_suggestion
    DROP CONSTRAINT IF EXISTS uq_match_suggestion;

ALTER TABLE match_suggestion
    ADD CONSTRAINT uq_match_suggestion UNIQUE (user_id, suggested_user_id);
