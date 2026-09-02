/*
  Warnings:

  - You are about to drop the column `paymentProviderId` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentOrderId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paymentOrderId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Payment_paymentProviderId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "paymentProviderId",
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentOrderId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentOrderId_key" ON "Payment"("paymentOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentId_key" ON "Payment"("paymentId");
