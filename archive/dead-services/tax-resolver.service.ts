import { PrismaClient } from '@prisma/client'
import { TaxRateInfo } from '../../../packages/proposals/src/utils/tax-calculator'

const prisma = new PrismaClient()

export class TaxResolverService {
    /**
     * Find applicable tax rates for a given location
     * @param city City name (e.g. "Dallas")
     * @param county County name (e.g. "Dallas" or "Collin")
     * @param state State code (e.g. "TX")
     */
    static async resolveRates(city: string, county: string, state: string = 'TX'): Promise<TaxRateInfo[]> {
        const rates: TaxRateInfo[] = []

        // 1. Get State Rate (Always applicable)
        const stateRate = await prisma.taxRate.findFirst({
            where: {
                jurisdictionType: 'STATE',
                name: { contains: state }, // Simplification for matching "Texas State"
                active: true
            }
        })

        if (stateRate) {
            rates.push({
                id: stateRate.id,
                name: stateRate.name,
                rate: Number(stateRate.rate),
                jurisdictionType: 'STATE'
            })
        }

        // 2. Get County Rate
        if (county) {
            const countyRate = await prisma.taxRate.findFirst({
                where: {
                    jurisdictionType: 'COUNTY',
                    name: { equals: `${county} County` }, // Convention: Name includes "County"
                    active: true
                }
            })

            if (countyRate) {
                rates.push({
                    id: countyRate.id,
                    name: countyRate.name,
                    rate: Number(countyRate.rate),
                    jurisdictionType: 'COUNTY'
                })
            }
        }

        // 3. Get City Rate
        if (city) {
            const cityRate = await prisma.taxRate.findFirst({
                where: {
                    jurisdictionType: 'CITY',
                    name: { equals: `City of ${city}` }, // Convention: "City of X"
                    active: true
                }
            })

            if (cityRate) {
                rates.push({
                    id: cityRate.id,
                    name: cityRate.name,
                    rate: Number(cityRate.rate),
                    jurisdictionType: 'CITY'
                })
            }
        }

        return rates
    }
}
