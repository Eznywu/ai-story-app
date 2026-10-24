-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "length" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "age" TEXT,
    "language" TEXT,
    "mainCharacterName" TEXT,
    "childGender" TEXT,
    "posterFilename" TEXT,
    "dailyAutomated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voice" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "voiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voice_pkey" PRIMARY KEY ("id")
);
