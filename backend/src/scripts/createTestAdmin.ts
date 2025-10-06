import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
    console.log('Creating test admin user...');

    // Delete existing test admin if exists
    await prisma.user.deleteMany({
      where: { email: 'admin@example.com' },
    });

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('AdminPassword123!', saltRounds);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true,
      },
    });

    console.log('\n✅ Test admin user created successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: AdminPassword123!`);
    console.log(`Role: ${admin.role}`);
    console.log(`ID: ${admin.id}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error creating admin:', errorMessage);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAdmin();
