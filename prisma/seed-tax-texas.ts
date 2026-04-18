import { PrismaClient, TaxJurisdictionType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding Texas Tax Rates...')

    const taxes = [
        // --- STATE ---
        {
            name: 'Texas State Sales Tax',
            rate: 0.0625, // 6.25%
            jurisdictionType: 'STATE' as TaxJurisdictionType,
            active: true
        },

        // --- MAJOR COUNTIES (Samples) ---
        // Note: Many counties default to 0.5% or just rely on City tax, but varies.
        {
            name: 'Dallas County',
            rate: 0.0000, // Dallas County often 0% for sales tax directly, logic varies, but putting placeholder
            jurisdictionType: 'COUNTY' as TaxJurisdictionType,
            active: true
        },
        {
            name: 'Harris County',
            rate: 0.0000,
            jurisdictionType: 'COUNTY' as TaxJurisdictionType,
            active: true
        },

        // --- MAJOR CITIES (The 2% max local usually comes from here + MTA) ---
        // Standard max local tax is 2.00%, total 8.25%.
        {
            name: 'City of Dallas',
            rate: 0.0100, // 1% City + 1% MTA usually
            jurisdictionType: 'CITY' as TaxJurisdictionType,
            active: true
        },
        {
            name: 'City of Houston',
            rate: 0.0100,
            jurisdictionType: 'CITY' as TaxJurisdictionType,
            active: true
        },
        {
            name: 'City of Austin',
            rate: 0.0100,
            jurisdictionType: 'CITY' as TaxJurisdictionType,
            active: true
        },
        {
            name: 'City of Frisco',
            rate: 0.0200, // Frisco is 2% local (Total 8.25%)
            jurisdictionType: 'CITY' as TaxJurisdictionType,
            active: true
        },
        {
            name: 'City of Plano',
            rate: 0.0200, // Plano is 2% local
            jurisdictionType: 'CITY' as TaxJurisdictionType,
            active: true
        }
    ]

    for (const tax of taxes) {
        const exists = await prisma.taxRate.findFirst({
            where: { name: tax.name }
        })

        if (!exists) {
            await prisma.taxRate.create({
                data: tax
            })
            console.log(`Created: ${tax.name}`)
        } else {
            console.log(`Skipped: ${tax.name} (Exists)`)
        }
    }

    console.log('✅ Texas Tax Seed Completed!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
