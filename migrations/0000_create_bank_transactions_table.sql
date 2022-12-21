-- Migration number: 0000 	 2022-12-21T09:11:19.287Z

DROP TABLE IF EXISTS bank_transactions;

CREATE TABLE bank_transactions (
  id VARCHAR(40) PRIMARY KEY NOT NULL,
  booking_date DATE NOT NULL,
  value_date DATE NOT NULL,
  blob BLOB NOT NULL
);

CREATE INDEX bank_transactions_booking_date_idx ON bank_transactions (booking_date);
