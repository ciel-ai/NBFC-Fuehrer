-- AlterTable: new customers start with app-facing KYC state "none"
ALTER TABLE "users" ALTER COLUMN "kycStatus" SET DEFAULT 'none';

-- CreateTable
CREATE TABLE "sales_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "fdoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "sales_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_agents_userId_key" ON "sales_agents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "sales_agents" ADD CONSTRAINT "sales_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
