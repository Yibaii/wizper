-- CreateTable
CREATE TABLE "Expression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "minted" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "owner" TEXT NOT NULL,
    "tokenURI" TEXT,
    "txHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mintedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "Link_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Expression" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Link_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Expression" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
