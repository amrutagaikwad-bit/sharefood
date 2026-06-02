import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("password123", 10);

  const donor = await prisma.user.upsert({
    where: { email: "donor@foodbridge.com" },
    update: {},
    create: {
      name: "Sample Donor",
      email: "donor@foodbridge.com",
      password: hashed,
      role: "DONOR",
      phone: "+910000000000"
    }
  });

  await prisma.user.upsert({
    where: { email: "receiver@foodbridge.com" },
    update: {},
    create: {
      name: "Sample Receiver",
      email: "receiver@foodbridge.com",
      password: hashed,
      role: "RECEIVER",
      phone: "+910000000001"
    }
  });

  await prisma.donation.create({
    data: {
      donorId: donor.id,
      foodName: "Vegetable Pulao",
      category: "Cooked Meal",
      quantity: "10 packs",
      description: "Freshly prepared lunch packs",
      image: "https://images.unsplash.com/photo-1512058564366-18510be2db19",
      latitude: 12.9716,
      longitude: 77.5946,
      address: "MG Road, Bengaluru",
      pickupInstructions: "Collect from gate no.2 between 6 PM - 8 PM",
      expiryTime: new Date(Date.now() + 6 * 60 * 60 * 1000)
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

