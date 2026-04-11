CREATE TABLE feedback (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    category   VARCHAR(30)  NOT NULL,
    rating     INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message    TEXT,
    created_at TIMESTAMP    NOT NULL,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE feedback_topics (
    feedback_id BIGINT      NOT NULL,
    topic       VARCHAR(50) NOT NULL,
    CONSTRAINT fk_feedback_topics_feedback FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
);
