CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "user" (
                        id BIGSERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        username VARCHAR(50) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        role VARCHAR(20) NOT NULL,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP
);

CREATE TABLE user_profile (
                              id BIGSERIAL PRIMARY KEY,
                              user_id BIGINT NOT NULL UNIQUE,
                              full_name VARCHAR(100),
                              bio TEXT,
                              job_city VARCHAR(100),
                              job_state VARCHAR(100),
                              job_type VARCHAR(50),
                              program_start DATE,
                              program_end DATE,
                              profile_photo_url VARCHAR(255),
                              location GEOGRAPHY(POINT, 4326),
                              created_at TIMESTAMP NOT NULL,
                              updated_at TIMESTAMP,
                              CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE interest (
                          id BIGSERIAL PRIMARY KEY,
                          name VARCHAR(100) NOT NULL UNIQUE,
                          category VARCHAR(100)
);

CREATE TABLE user_interest (
                               id BIGSERIAL PRIMARY KEY,
                               user_id BIGINT NOT NULL,
                               interest_id BIGINT NOT NULL,
                               CONSTRAINT fk_user_interest_user FOREIGN KEY (user_id) REFERENCES "user"(id),
                               CONSTRAINT fk_user_interest_interest FOREIGN KEY (interest_id) REFERENCES interest(id),
                               CONSTRAINT uq_user_interest UNIQUE (user_id, interest_id)
);

CREATE TABLE friendship (
                            id BIGSERIAL PRIMARY KEY,
                            requester_id BIGINT NOT NULL,
                            addressee_id BIGINT NOT NULL,
                            status VARCHAR(20) NOT NULL,
                            created_at TIMESTAMP NOT NULL,
                            updated_at TIMESTAMP,
                            updated_by BIGINT,
                            CONSTRAINT fk_friendship_requester FOREIGN KEY (requester_id) REFERENCES "user"(id),
                            CONSTRAINT fk_friendship_addressee FOREIGN KEY (addressee_id) REFERENCES "user"(id),
                            CONSTRAINT fk_friendship_updated_by FOREIGN KEY (updated_by) REFERENCES "user"(id),
                            CONSTRAINT uq_friendship UNIQUE (requester_id, addressee_id)
);

CREATE TABLE event (
                       id BIGSERIAL PRIMARY KEY,
                       organizer_id BIGINT NOT NULL,
                       title VARCHAR(255) NOT NULL,
                       description TEXT,
                       location VARCHAR(255),
                       event_location GEOGRAPHY(POINT, 4326),
                       event_date TIMESTAMP NOT NULL,
                       max_participants INTEGER,
                       created_at TIMESTAMP NOT NULL,
                       updated_at TIMESTAMP,
                       CONSTRAINT fk_event_organizer FOREIGN KEY (organizer_id) REFERENCES "user"(id)
);

CREATE TABLE event_participant (
                                   id BIGSERIAL PRIMARY KEY,
                                   event_id BIGINT NOT NULL,
                                   user_id BIGINT NOT NULL,
                                   status VARCHAR(20) NOT NULL,
                                   qr_code_token VARCHAR(255) UNIQUE,
                                   joined_at TIMESTAMP NOT NULL,
                                   checked_in_at TIMESTAMP,
                                   updated_at TIMESTAMP,
                                   updated_by BIGINT,
                                   CONSTRAINT fk_event_participant_event FOREIGN KEY (event_id) REFERENCES event(id),
                                   CONSTRAINT fk_event_participant_user FOREIGN KEY (user_id) REFERENCES "user"(id),
                                   CONSTRAINT fk_event_participant_updated_by FOREIGN KEY (updated_by) REFERENCES "user"(id),
                                   CONSTRAINT uq_event_participant UNIQUE (event_id, user_id)
);

CREATE TABLE trip (
                      id BIGSERIAL PRIMARY KEY,
                      user_id BIGINT NOT NULL,
                      title VARCHAR(255) NOT NULL,
                      description TEXT,
                      start_date DATE,
                      end_date DATE,
                      status VARCHAR(20) NOT NULL,
                      is_public BOOLEAN NOT NULL DEFAULT FALSE,
                      max_members INTEGER,
                      created_at TIMESTAMP NOT NULL,
                      updated_at TIMESTAMP,
                      CONSTRAINT fk_trip_user FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE trip_stop (
                           id BIGSERIAL PRIMARY KEY,
                           trip_id BIGINT NOT NULL,
                           city VARCHAR(100) NOT NULL,
                           country VARCHAR(100) NOT NULL,
                           order_index INTEGER NOT NULL,
                           day_number INTEGER NOT NULL,
                           notes TEXT,
                           address VARCHAR(255),
                           stop_location GEOGRAPHY(POINT, 4326),
                           created_at TIMESTAMP NOT NULL,
                           updated_at TIMESTAMP,
                           CONSTRAINT fk_trip_stop_trip FOREIGN KEY (trip_id) REFERENCES trip(id),
                           CONSTRAINT uq_trip_stop_order UNIQUE (trip_id, order_index)
);

CREATE TABLE trip_member (
                             id BIGSERIAL PRIMARY KEY,
                             trip_id BIGINT NOT NULL,
                             user_id BIGINT NOT NULL,
                             status VARCHAR(20) NOT NULL,
                             joined_at TIMESTAMP NOT NULL,
                             updated_at TIMESTAMP,
                             updated_by BIGINT,
                             CONSTRAINT fk_trip_member_trip FOREIGN KEY (trip_id) REFERENCES trip(id),
                             CONSTRAINT fk_trip_member_user FOREIGN KEY (user_id) REFERENCES "user"(id),
                             CONSTRAINT fk_trip_member_updated_by FOREIGN KEY (updated_by) REFERENCES "user"(id),
                             CONSTRAINT uq_trip_member UNIQUE (trip_id, user_id)
);

CREATE TABLE match_suggestion (
                                  id BIGSERIAL PRIMARY KEY,
                                  user_id BIGINT NOT NULL,
                                  suggested_user_id BIGINT NOT NULL,
                                  compatibility_score FLOAT,
                                  reason TEXT,
                                  is_dismissed BOOLEAN DEFAULT FALSE,
                                  created_at TIMESTAMP NOT NULL,
                                  CONSTRAINT fk_match_suggestion_user FOREIGN KEY (user_id) REFERENCES "user"(id),
                                  CONSTRAINT fk_match_suggestion_suggested FOREIGN KEY (suggested_user_id) REFERENCES "user"(id),
                                  CONSTRAINT uq_match_suggestion UNIQUE (user_id, suggested_user_id)
);

CREATE TABLE notification (
                              id BIGSERIAL PRIMARY KEY,
                              user_id BIGINT NOT NULL,
                              type VARCHAR(50) NOT NULL,
                              message TEXT NOT NULL,
                              is_read BOOLEAN DEFAULT FALSE,
                              created_at TIMESTAMP NOT NULL,
                              CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES "user"(id)
);

-- Indexes
CREATE INDEX idx_notification_user_read ON notification(user_id, is_read);
CREATE INDEX idx_notification_user_created ON notification(user_id, created_at);
CREATE INDEX idx_match_suggestion_user_dismissed ON match_suggestion(user_id, is_dismissed);
CREATE INDEX idx_match_suggestion_user_score ON match_suggestion(user_id, compatibility_score);
CREATE INDEX idx_friendship_requester_status ON friendship(requester_id, status);
CREATE INDEX idx_friendship_addressee_status ON friendship(addressee_id, status);
CREATE INDEX idx_event_participant_event_status ON event_participant(event_id, status);
CREATE INDEX idx_event_participant_user_status ON event_participant(user_id, status);
CREATE INDEX idx_trip_member_user_status ON trip_member(user_id, status);
CREATE INDEX idx_trip_stop_order ON trip_stop(trip_id, order_index);