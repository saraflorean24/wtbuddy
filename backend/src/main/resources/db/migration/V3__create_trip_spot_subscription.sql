CREATE TABLE trip_spot_subscription (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_tss_trip FOREIGN KEY (trip_id) REFERENCES trip(id) ON DELETE CASCADE,
    CONSTRAINT fk_tss_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT uq_tss_trip_user UNIQUE (trip_id, user_id)
);
