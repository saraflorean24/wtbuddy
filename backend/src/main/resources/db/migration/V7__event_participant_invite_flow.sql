ALTER TABLE event_participant ADD COLUMN declined_by_owner BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE event_participant DROP CONSTRAINT IF EXISTS event_participant_status_check;

ALTER TABLE event_participant
    ADD CONSTRAINT event_participant_status_check
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'INVITED'));
