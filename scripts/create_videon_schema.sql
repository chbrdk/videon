-- Create videon schema in STORION database
-- Run this script in STORION PostgreSQL database

-- Connect to storion database
\c storion

-- Create videon schema if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'videon') THEN
        CREATE SCHEMA videon;
        RAISE NOTICE 'Schema videon created';
    ELSE
        RAISE NOTICE 'Schema videon already exists';
    END IF;
END $$;

-- Grant privileges to unison user
GRANT ALL ON SCHEMA videon TO unison;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA videon TO unison;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA videon TO unison;
ALTER DEFAULT PRIVILEGES IN SCHEMA videon GRANT ALL ON TABLES TO unison;
ALTER DEFAULT PRIVILEGES IN SCHEMA videon GRANT ALL ON SEQUENCES TO unison;

-- Verify schema creation
SELECT schema_name, schema_owner 
FROM information_schema.schemata 
WHERE schema_name = 'videon';
