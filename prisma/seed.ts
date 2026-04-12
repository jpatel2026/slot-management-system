import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Products
  const ca1 = await prisma.product.create({
    data: { name: 'CARTAsset1', code: 'CA1', mfgType: 'Frozen', active: true },
  })
  const ca2 = await prisma.product.create({
    data: { name: 'CARTAsset2', code: 'CA2', mfgType: 'Fresh & Frozen', active: true },
  })
  console.log('  Products created')

  // Care Programs
  const cpUsComCA1 = await prisma.careProgram.create({
    data: { name: 'US-Commercial-CA1', therapyType: 'Commercial', country: 'US', productId: ca1.id, active: true },
  })
  await prisma.careProgram.create({
    data: { name: 'Clinical-CA1', therapyType: 'Clinical', country: null, productId: ca1.id, active: true },
  })
  await prisma.careProgram.create({
    data: { name: 'US-Commercial-CA2', therapyType: 'Commercial', country: 'US', productId: ca2.id, active: true },
  })
  console.log('  Care Programs created')

  // Sites
  const aphSite1 = await prisma.account.create({
    data: { name: 'Moffitt Cancer Center', siteId: 'USMoffit01', alias: 'APHUS1', siteType: 'Apheresis', address: '12902 USF Magnolia Dr, Tampa, FL', contactName: 'Dr. Sarah Chen', contactEmail: 'sarah.chen@moffitt.org', contactPhone: '813-745-4673', mfgType: 'Frozen', active: true },
  })
  const aphSite2 = await prisma.account.create({
    data: { name: 'MD Anderson Cancer Center', siteId: 'USMDAnderson01', alias: 'APHUS2', siteType: 'Apheresis', address: '1515 Holcombe Blvd, Houston, TX', contactName: 'Dr. James Park', contactEmail: 'james.park@mdanderson.org', contactPhone: '713-792-2121', mfgType: 'Fresh & Frozen', active: true },
  })
  const cryoSite1 = await prisma.account.create({
    data: { name: 'Cryo Solutions East', siteId: 'USCryoEast01', alias: 'CRYUS1', siteType: 'Cryopreservation', address: '100 Cryo Park Dr, Philadelphia, PA', contactName: 'Mike Torres', contactEmail: 'mtorres@cryosol.com', contactPhone: '215-555-0101', active: true },
  })
  const cryoSite2 = await prisma.account.create({
    data: { name: 'Cryo Solutions West', siteId: 'USCryoWest01', alias: 'CRYUS2', siteType: 'Cryopreservation', address: '200 Freeze Ln, San Diego, CA', contactName: 'Linda Wu', contactEmail: 'lwu@cryosol.com', contactPhone: '619-555-0202', active: true },
  })
  const mfgSite1 = await prisma.account.create({
    data: { name: 'BioManufacturing East', siteId: 'USBioMfgE01', alias: 'MFGUS1', siteType: 'Manufacturing', address: '500 Cell Therapy Blvd, Morris Plains, NJ', contactName: 'Dr. Robert Kim', contactEmail: 'rkim@biomfg.com', contactPhone: '973-555-0301', mfgType: 'Frozen', active: true },
  })
  const mfgSite2 = await prisma.account.create({
    data: { name: 'BioManufacturing West', siteId: 'USBioMfgW01', alias: 'MFGUS2', siteType: 'Manufacturing', address: '700 Gene Way, South San Francisco, CA', contactName: 'Dr. Emily Davis', contactEmail: 'edavis@biomfg.com', contactPhone: '650-555-0401', mfgType: 'Fresh & Frozen', active: true },
  })
  const wdcSite = await prisma.account.create({
    data: { name: 'National WDC', siteId: 'USWDC01', alias: 'WDCUS1', siteType: 'Distribution Center', address: '900 Logistics Pkwy, Memphis, TN', contactName: 'Tom Johnson', contactEmail: 'tjohnson@wdc.com', contactPhone: '901-555-0501', active: true },
  })
  const infusionSite = await prisma.account.create({
    data: { name: 'Memorial Sloan Kettering', siteId: 'USMSK01', alias: 'INFUS1', siteType: 'Infusion', address: '1275 York Ave, New York, NY', contactName: 'Dr. Alison White', contactEmail: 'awhite@msk.org', contactPhone: '212-555-0601', active: true },
  })
  console.log('  Sites created')

  // Site Relationships
  await prisma.siteRelationship.create({
    data: {
      name: 'Moffitt-CryoEast-MfgEast', active: true,
      aphSiteId: aphSite1.id, cryoSiteId: cryoSite1.id, cryoPreference: 'Primary',
      mfgSiteId: mfgSite1.id, mfgPreference: 'Primary',
      wdcSiteId: wdcSite.id, infusionSiteId: infusionSite.id,
      effectiveDate: new Date('2026-01-01'),
    },
  })
  await prisma.siteRelationship.create({
    data: {
      name: 'Moffitt-CryoWest-MfgWest', active: true,
      aphSiteId: aphSite1.id, cryoSiteId: cryoSite2.id, cryoPreference: 'Secondary',
      mfgSiteId: mfgSite2.id, mfgPreference: 'Secondary',
      infusionSiteId: infusionSite.id,
      effectiveDate: new Date('2026-01-01'),
    },
  })
  await prisma.siteRelationship.create({
    data: {
      name: 'MDAnderson-CryoWest-MfgWest', active: true,
      aphSiteId: aphSite2.id, cryoSiteId: cryoSite2.id, cryoPreference: 'Primary',
      mfgSiteId: mfgSite2.id, mfgPreference: 'Primary',
      infusionSiteId: infusionSite.id,
      effectiveDate: new Date('2026-01-01'),
    },
  })
  console.log('  Site Relationships created')

  // Holidays
  await prisma.holiday.createMany({
    data: [
      { name: 'Independence Day', date: new Date('2026-07-04'), accountId: mfgSite1.id, active: true },
      { name: 'Independence Day', date: new Date('2026-07-04'), accountId: mfgSite2.id, active: true },
      { name: 'Labor Day', date: new Date('2026-09-07'), accountId: mfgSite1.id, active: true },
      { name: 'Christmas Day', date: new Date('2026-12-25'), accountId: mfgSite1.id, active: true },
      { name: 'Christmas Day', date: new Date('2026-12-25'), accountId: mfgSite2.id, active: true },
      { name: 'Christmas Day', date: new Date('2026-12-25'), accountId: cryoSite1.id, active: true },
    ],
  })
  console.log('  Holidays created')

  // IBP
  for (const mfgSite of [mfgSite1, mfgSite2]) {
    for (const m of [5, 6, 7, 8]) {
      await prisma.ibp.create({
        data: {
          name: `${mfgSite.siteId}-${m}-2026`,
          mfgSiteId: mfgSite.id, month: m, year: 2026,
          commercialCapacity: 60, clinicalCapacity: 30, nonPatientCapacity: 10, reserveCapacity: 10,
        },
      })
    }
  }
  console.log('  IBP records created')

  // MPS - daily records for May 2026
  for (const mfgSite of [mfgSite1, mfgSite2]) {
    for (let day = 1; day <= 31; day++) {
      const date = new Date(2026, 4, day) // May
      if (date.getMonth() !== 4) continue // Skip invalid dates
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      await prisma.mps.create({
        data: {
          name: `${mfgSite.siteId}-${date.toISOString().split('T')[0]}`,
          mfgSiteId: mfgSite.id, date,
          patientCapacity: isWeekend ? 2 : 5,
          nonPatientCapacity: isWeekend ? 0 : 1,
        },
      })
    }
  }
  console.log('  MPS records created')

  // GDLT
  await prisma.gdlt.createMany({
    data: [
      { name: 'Moffitt-CA1-Frozen', siteId: aphSite1.id, productId: ca1.id, mfgType: 'Frozen', minLt: 1, maxLt: 3 },
      { name: 'MDAnderson-CA1-Frozen', siteId: aphSite2.id, productId: ca1.id, mfgType: 'Frozen', minLt: 2, maxLt: 4 },
      { name: 'MDAnderson-CA2-Fresh', siteId: aphSite2.id, productId: ca2.id, mfgType: 'Fresh', exactLt: 1 },
      { name: 'MDAnderson-CA2-Frozen', siteId: aphSite2.id, productId: ca2.id, mfgType: 'Frozen', minLt: 1, maxLt: 3 },
    ],
  })
  console.log('  GDLT records created')

  // LTM Config - US-Commercial-CA1 Central Cryo milestones
  const milestones = [
    { name: 'Order Booking Date', leg: 1, ul: 'Creation Date', lt: null },
    { name: 'Apheresis Completed', leg: 2, ul: 'Collection Date', lt: null },
    { name: 'Apheresis Picked Up', leg: 3, ul: 'Collection Date', lt: null },
    { name: 'Aph Received at Central Cryo', leg: 4, ul: 'Lead Time', lt: 1 },
    { name: 'Cryopreservation Completed', leg: 5, ul: 'Cryopreservation Daily Capacity', lt: 1 },
    { name: 'Cryo Picked Up', leg: 6, ul: 'Lead Time', lt: 1, nwd: 'Sat,Sun' },
    { name: 'Aph Received at Manufacturing', leg: 7, ul: 'Lead Time', lt: 1 },
    { name: 'Apheresis Released', leg: 8, ul: 'Lead Time', lt: 1 },
    { name: 'Manufacturing Started', leg: 9, ul: 'Manufacturing Daily Capacity', lt: 2 },
    { name: 'Manufacturing Completed', leg: 10, ul: 'Lead Time', lt: 10 },
    { name: 'FP Released', leg: 11, ul: 'Lead Time', lt: 12 },
    { name: 'FP Shipped from Manufacturing', leg: 12, ul: 'Lead Time', lt: 2 },
    { name: 'FP Delivered at Infusion', leg: 13, ul: 'Lead Time', lt: 1 },
  ]

  for (const ms of milestones) {
    await prisma.ltmConfig.create({
      data: {
        milestoneName: ms.name,
        leg: ms.leg,
        careProgramId: cpUsComCA1.id,
        cryoTypes: 'Central',
        wdcApplicable: false,
        active: true,
        cryoLeadTime: ms.lt,
        updateLogicCentral: ms.ul,
        centralApplicability: 'Applicable',
        nonWorkingDay: ms.nwd || null,
      },
    })
  }
  console.log('  LTM Config created')

  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
