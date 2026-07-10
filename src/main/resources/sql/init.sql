DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS plan_logs;
DROP TABLE IF EXISTS plan_items;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS users;

SOURCE src/main/resources/db/migration/V1__init_schema.sql;
SOURCE src/main/resources/db/devdata/R__demo_data.sql;
