import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@foodbridge.com" },
    update: {},
    create: {
      name: "FoodBridge Admin",
      email: "admin@foodbridge.com",
      password: hashed,
      role: "ADMIN",
      phone: "+910000000099"
    }
  });

  await prisma.user.upsert({
    where: { email: "superadmin@foodbridge.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@foodbridge.com",
      password: hashed,
      role: "SUPER_ADMIN",
      phone: "+910000000098"
    }
  });

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

  const existing = await prisma.donation.findFirst({ where: { donorId: donor.id } });
  if (!existing) {
    await prisma.donation.create({
      data: {
        donorId: donor.id,
        foodName: "Vegetable Pulao",
        category: "Cooked Meal",
        quantity: "10 packs",
        servesCount: 100,
        servingsRemaining: 100,
        description: "Freshly prepared lunch packs",
        image: "https://images.unsplash.com/photo-1512058564366-18510be2db19",
        latitude: 12.9716,
        longitude: 77.5946,
        address: "MG Road, Bengaluru, Karnataka 560001",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        specialInstructions: "Collect from gate no.2 between 6 PM - 8 PM",
        contactPhone: "+910000000000",
        preparationAt: new Date(),
        expiryTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        pickupStart: new Date(Date.now() + 2 * 60 * 60 * 1000),
        pickupEnd: new Date(Date.now() + 6 * 60 * 60 * 1000),
        status: "ACTIVE"
      }
    });
  }

  const defaults = [
    ["site_name", "FoodBridge"],
    ["support_email", "support@foodbridge.com"],
    ["max_donation_radius_km", "25"]
  ];
  for (const [key, value] of defaults) {
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: {}
    });
  }

  console.log("Seed complete. Admin:", admin.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
