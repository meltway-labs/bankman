-- Migration number: 0002 	 2023-03-07T22:13:50.828Z

DROP TABLE IF EXISTS execution_logs;

CREATE TABLE execution_logs (
  revision VARCHAR(20) NOT NULL
  created_at DATE NOT NULL,
  logs BLOB
);

CREATE INDEX execution_logs_created_at_idx ON execution_logs (created_at);
