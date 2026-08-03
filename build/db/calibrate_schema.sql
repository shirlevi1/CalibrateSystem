CREATE SCHEMA IF NOT EXISTS calibrate_schema;
CREATE USER IF NOT EXISTS 'calibrate_db_user'@'%' IDENTIFIED BY 'calibrate_pass';
GRANT ALL PRIVILEGES ON calibrate_schema.* TO 'calibrate_db_user'@'%';
FLUSH PRIVILEGES;
