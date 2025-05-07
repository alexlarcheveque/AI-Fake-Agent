\c postgres;

SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'real_estate_leads_db'
AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS real_estate_leads_db;
CREATE DATABASE real_estate_leads_db; 