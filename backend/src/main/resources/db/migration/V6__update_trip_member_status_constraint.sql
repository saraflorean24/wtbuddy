ALTER TABLE trip_member DROP CONSTRAINT IF EXISTS trip_member_status_check;

ALTER TABLE trip_member
    ADD CONSTRAINT trip_member_status_check
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'INVITED'));
