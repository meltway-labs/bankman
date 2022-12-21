-- Migration number: 0001 	 2022-12-21T13:06:10.720Z

DROP TABLE IF EXISTS transaction_notifications;

CREATE TABLE transaction_notifications (
  id VARCHAR(40) PRIMARY KEY NOT NULL,
  created_at DATE NOT NULL
);
