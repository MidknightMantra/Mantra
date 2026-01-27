import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
    // Session
    SESSION_ID: z.string().optional(),

    // Bot Info
    OWNER_NUMBER: z.string().default('254732647560').describe("Owner's WhatsApp number"),
    PACK_NAME: z.string().default('Mantra').describe("Sticker pack name"),
    AUTHOR_NAME: z.string().default('MidknightMantra').describe("Sticker author name"),

    // Command Prefixes (stored as comma-separated string in env, parsed to array)
    PREFIX: z.string().default(',!').transform((val) => val.split('').filter(c => c.length > 0)),

    // Feature Toggles (env vars are strings, convert to boolean)
    ALWAYS_ONLINE: z.string().default('true').transform((v) => v === 'true'),
    ANTI_DELETE: z.string().default('true').transform((v) => v === 'true'),
    ANTI_VIEW_ONCE: z.string().default('true').transform((v) => v === 'true'),
    AUTO_READ_STATUS: z.string().default('true').transform((v) => v === 'true'),

    // Database
    DATABASE_URL: z.string().default("file:./mantra.db"),

    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
})

export const config = envSchema.parse(process.env)

export const isTrue = (value: boolean) => value === true
