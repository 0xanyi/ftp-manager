import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('=== Create Initial Admin User ===\n');

    // Get admin details
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');

    // Validate input
    if (!email || !password) {
      console.log('Email and password are required');
      return;
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log(`Admin user already exists: ${existingAdmin.email}`);
      const overwrite = await question('Do you want to create another admin? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        return;
      }
    }

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      console.log('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');
      return;
    }

    if (password.length < 8) {
      console.log('Password must be at least 8 characters long');
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
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

    console.log('\n✅ Admin user created successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`ID: ${admin.id}`);
    console.log('\nYou can now use these credentials to log in to the admin panel.');

  } catch (error: any) {
    console.error('❌ Error creating admin:', error.message);
    
    if (error.code === 'P2002') {
      console.log('A user with this email already exists');
    }
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createAdmin();
}

export { createAdmin };
