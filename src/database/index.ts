import { PrismaClient } from '@prisma/client'

// Singleton Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function connectDB() {
    try {
        await prisma.$connect()
        console.log('📦 Database connected successfully')
    } catch (error) {
        console.error('❌ Database connection failed', error)
        process.exit(1)
    }
}
