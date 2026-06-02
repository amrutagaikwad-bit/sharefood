-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "donorId" INTEGER NOT NULL,
    "foodName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "quantity" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "pickupInstructions" TEXT,
    "expiryTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "donationId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Request_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
