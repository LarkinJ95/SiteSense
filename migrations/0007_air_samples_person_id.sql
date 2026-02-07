ALTER TABLE air_samples
ADD COLUMN person_id TEXT REFERENCES personnel(person_id) ON DELETE SET NULL;

