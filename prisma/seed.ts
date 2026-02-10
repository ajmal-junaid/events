import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // Create Default Branch
    const mainBranch = await prisma.branch.upsert({
        where: { id: "65c3f9b0e4b0a1b2c3d4e5f6" }, // Fixed ObjectId for consistency
        update: {},
        create: {
            id: "65c3f9b0e4b0a1b2c3d4e5f6",
            name: 'AK Events',
            address: 'Deli',
            phone: '9847131427'
        }
    })

    // Create Super Admin (no branchId - oversees all branches)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@rental.com' },
        update: {},
        create: {
            name: 'Super Admin',
            email: 'admin@rental.com',
            password: hashedPassword,
            role: Role.SUPER_ADMIN,
            // Super admin has no branchId - they manage all branches
        }
    })

    console.log({ mainBranch, admin })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
