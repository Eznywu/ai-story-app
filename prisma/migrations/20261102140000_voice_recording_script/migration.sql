-- Recording script identity, stored separately from story narration language.
-- Additive only. Existing voice rows keep their data; these columns stay null until a new recording is saved.

ALTER TABLE "Voice" ADD COLUMN "recordingLocale" TEXT;
ALTER TABLE "Voice" ADD COLUMN "scriptVersion" TEXT;
