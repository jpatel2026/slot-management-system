import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helpers
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function addDays(date: Date, days: number): Date {
  const r = new Date(date)
  r.setDate(r.getDate() + days)
  return r
}
function formatDateShort(d: Date): string {
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear().toString().slice(-2)
  return `${day}${month}${year}`
}
function skipWeekends(d: Date): Date {
  const r = new Date(d)
  while (r.getDay() === 0 || r.getDay() === 6) r.setDate(r.getDate() + 1)
  return r
}

async function main() {
  console.log('=== FULL SEED: Clearing all existing data ===')

  await prisma.orderMilestone.deleteMany()
  await prisma.orderReservation.deleteMany()
  await prisma.dailyCapacity.deleteMany()
  await prisma.gdlt.deleteMany()
  await prisma.mps.deleteMany()
  await prisma.ibp.deleteMany()
  await prisma.siteRelationship.deleteMany()
  await prisma.holiday.deleteMany()
  await prisma.ltmConfig.deleteMany()
  await prisma.utilizationQueue.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.careProgram.deleteMany()
  await prisma.account.deleteMany()
  await prisma.product.deleteMany()

  console.log('  All tables cleared.')

  // =====================================================
  // 1. PRODUCTS (4 products)
  // =====================================================
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'CARTAsset1', code: 'CA1', mfgType: 'Frozen', active: true } }),
    prisma.product.create({ data: { name: 'CARTAsset2', code: 'CA2', mfgType: 'Fresh & Frozen', active: true } }),
    prisma.product.create({ data: { name: 'TCRTherapy3', code: 'TCR3', mfgType: 'Fresh', active: true } }),
    prisma.product.create({ data: { name: 'NKCellBoost', code: 'NK4', mfgType: 'Frozen', active: true } }),
  ])
  console.log(`  ${products.length} Products created`)

  // =====================================================
  // 2. CARE PROGRAMS (8 programs)
  // =====================================================
  const carePrograms = await Promise.all([
    prisma.careProgram.create({ data: { name: 'US-Commercial-CA1', therapyType: 'Commercial', country: 'US', productId: products[0].id } }),
    prisma.careProgram.create({ data: { name: 'US-Commercial-CA2', therapyType: 'Commercial', country: 'US', productId: products[1].id } }),
    prisma.careProgram.create({ data: { name: 'CA-Commercial-CA1', therapyType: 'Commercial', country: 'CA', productId: products[0].id } }),
    prisma.careProgram.create({ data: { name: 'BR-Commercial-CA2', therapyType: 'Commercial', country: 'BR', productId: products[1].id } }),
    prisma.careProgram.create({ data: { name: 'Clinical-CA1', therapyType: 'Clinical', country: null, productId: products[0].id } }),
    prisma.careProgram.create({ data: { name: 'Clinical-CA2', therapyType: 'Clinical', country: null, productId: products[1].id } }),
    prisma.careProgram.create({ data: { name: 'US-Commercial-TCR3', therapyType: 'Commercial', country: 'US', productId: products[2].id } }),
    prisma.careProgram.create({ data: { name: 'Clinical-NK4', therapyType: 'Clinical', country: null, productId: products[3].id } }),
  ])
  console.log(`  ${carePrograms.length} Care Programs created`)

  // =====================================================
  // 3. ACCOUNTS / SITES (20 sites)
  // =====================================================
  const sites: Record<string, Awaited<ReturnType<typeof prisma.account.create>>> = {}

  // Apheresis sites (5)
  for (const s of [
    { name: 'Moffitt Cancer Center', siteId: 'USMoffit01', alias: 'APHUS1', address: '12902 USF Magnolia Dr, Tampa, FL', contact: 'Dr. Sarah Chen', email: 'schen@moffitt.org', phone: '813-745-4673', mfgType: 'Frozen' },
    { name: 'MD Anderson Cancer Center', siteId: 'USMDAnderson01', alias: 'APHUS2', address: '1515 Holcombe Blvd, Houston, TX', contact: 'Dr. James Park', email: 'jpark@mdanderson.org', phone: '713-792-2121', mfgType: 'Fresh & Frozen' },
    { name: 'Dana-Farber Cancer Institute', siteId: 'USDanaFarber01', alias: 'APHUS3', address: '450 Brookline Ave, Boston, MA', contact: 'Dr. Lisa Nguyen', email: 'lnguyen@dfci.org', phone: '617-632-3000', mfgType: 'Frozen' },
    { name: 'Princess Margaret Hospital', siteId: 'CAPrinMarg01', alias: 'APHCA1', address: '610 University Ave, Toronto, ON', contact: 'Dr. David Kim', email: 'dkim@uhn.ca', phone: '416-946-2000', mfgType: 'Frozen' },
    { name: 'Hospital Sirio-Libanes', siteId: 'BRSirio01', alias: 'APHBR1', address: 'R. Adma Jafet 91, Sao Paulo', contact: 'Dr. Maria Santos', email: 'msantos@sirio.org.br', phone: '+55-11-3155-0200', mfgType: 'Fresh & Frozen' },
  ]) {
    sites[s.siteId] = await prisma.account.create({
      data: { name: s.name, siteId: s.siteId, alias: s.alias, siteType: 'Apheresis', address: s.address, contactName: s.contact, contactEmail: s.email, contactPhone: s.phone, mfgType: s.mfgType, active: true },
    })
  }

  // Cryopreservation sites (3)
  for (const s of [
    { name: 'CryoSolutions East', siteId: 'USCryoEast01', alias: 'CRYUS1', address: '100 Cryo Park Dr, Philadelphia, PA', contact: 'Mike Torres', email: 'mtorres@cryosol.com', phone: '215-555-0101' },
    { name: 'CryoSolutions West', siteId: 'USCryoWest01', alias: 'CRYUS2', address: '200 Freeze Ln, San Diego, CA', contact: 'Linda Wu', email: 'lwu@cryosol.com', phone: '619-555-0202' },
    { name: 'CryoTech Canada', siteId: 'CACryoTech01', alias: 'CRYCA1', address: '55 Frost Way, Montreal, QC', contact: 'Jean Dupont', email: 'jdupont@cryotech.ca', phone: '514-555-0303' },
  ]) {
    sites[s.siteId] = await prisma.account.create({
      data: { name: s.name, siteId: s.siteId, alias: s.alias, siteType: 'Cryopreservation', address: s.address, contactName: s.contact, contactEmail: s.email, contactPhone: s.phone, active: true },
    })
  }

  // Manufacturing sites (3)
  for (const s of [
    { name: 'BioManufacturing East', siteId: 'USBioMfgE01', alias: 'MFGUS1', address: '500 Cell Therapy Blvd, Morris Plains, NJ', contact: 'Dr. Robert Kim', email: 'rkim@biomfg.com', phone: '973-555-0301', mfgType: 'Frozen' },
    { name: 'BioManufacturing West', siteId: 'USBioMfgW01', alias: 'MFGUS2', address: '700 Gene Way, South San Francisco, CA', contact: 'Dr. Emily Davis', email: 'edavis@biomfg.com', phone: '650-555-0401', mfgType: 'Fresh & Frozen' },
    { name: 'BioManufacturing Canada', siteId: 'CABioMfg01', alias: 'MFGCA1', address: '300 Biotech Rd, Mississauga, ON', contact: 'Dr. Ahmed Hassan', email: 'ahassan@biomfg.ca', phone: '905-555-0501', mfgType: 'Frozen' },
  ]) {
    sites[s.siteId] = await prisma.account.create({
      data: { name: s.name, siteId: s.siteId, alias: s.alias, siteType: 'Manufacturing', address: s.address, contactName: s.contact, contactEmail: s.email, contactPhone: s.phone, mfgType: s.mfgType, active: true },
    })
  }

  // WDC (2)
  for (const s of [
    { name: 'National WDC East', siteId: 'USWDCE01', alias: 'WDCUS1', address: '900 Logistics Pkwy, Memphis, TN', contact: 'Tom Johnson', email: 'tjohnson@wdc.com', phone: '901-555-0601' },
    { name: 'National WDC West', siteId: 'USWDCW01', alias: 'WDCUS2', address: '800 Distribution Dr, Phoenix, AZ', contact: 'Karen Lee', email: 'klee@wdc.com', phone: '480-555-0701' },
  ]) {
    sites[s.siteId] = await prisma.account.create({
      data: { name: s.name, siteId: s.siteId, alias: s.alias, siteType: 'Distribution Center', address: s.address, contactName: s.contact, contactEmail: s.email, contactPhone: s.phone, active: true },
    })
  }

  // Infusion sites (4)
  for (const s of [
    { name: 'Memorial Sloan Kettering', siteId: 'USMSK01', alias: 'INFUS1', address: '1275 York Ave, New York, NY', contact: 'Dr. Alison White', email: 'awhite@msk.org', phone: '212-555-0801' },
    { name: 'Mayo Clinic', siteId: 'USMayo01', alias: 'INFUS2', address: '200 First St SW, Rochester, MN', contact: 'Dr. Chris Brown', email: 'cbrown@mayo.edu', phone: '507-555-0901' },
    { name: 'Cedars-Sinai Medical Center', siteId: 'USCedars01', alias: 'INFUS3', address: '8700 Beverly Blvd, Los Angeles, CA', contact: 'Dr. Rachel Green', email: 'rgreen@csmc.edu', phone: '310-555-1001' },
    { name: 'Toronto General Hospital', siteId: 'CATorGen01', alias: 'INFCA1', address: '200 Elizabeth St, Toronto, ON', contact: 'Dr. Neil Patel', email: 'npatel@uhn.ca', phone: '416-555-1101' },
  ]) {
    sites[s.siteId] = await prisma.account.create({
      data: { name: s.name, siteId: s.siteId, alias: s.alias, siteType: 'Infusion', address: s.address, contactName: s.contact, contactEmail: s.email, contactPhone: s.phone, active: true },
    })
  }

  // Treatment sites (3) — aph + infusion combo
  for (const s of [
    { name: 'Cleveland Clinic', siteId: 'USCleveland01', alias: 'TXTUS1', address: '9500 Euclid Ave, Cleveland, OH', contact: 'Dr. Mark Wilson', email: 'mwilson@ccf.org', phone: '216-555-1201' },
    { name: 'Johns Hopkins Hospital', siteId: 'USJohnsHop01', alias: 'TXTUS2', address: '1800 Orleans St, Baltimore, MD', contact: 'Dr. Susan Lee', email: 'slee@jhmi.edu', phone: '410-555-1301' },
    { name: 'Mass General Brigham', siteId: 'USMassGen01', alias: 'TXTUS3', address: '55 Fruit St, Boston, MA', contact: 'Dr. Alan Ross', email: 'aross@mgb.org', phone: '617-555-1401' },
  ]) {
    sites[s.siteId] = await prisma.account.create({
      data: { name: s.name, siteId: s.siteId, alias: s.alias, siteType: 'Treatment', address: s.address, contactName: s.contact, contactEmail: s.email, contactPhone: s.phone, active: true },
    })
  }
  console.log(`  ${Object.keys(sites).length} Sites created`)

  // =====================================================
  // 4. HOLIDAYS (30+ holidays across May-Jul 2026)
  // =====================================================
  const allMfgCryoSiteIds = [
    sites['USBioMfgE01'].id, sites['USBioMfgW01'].id, sites['CABioMfg01'].id,
    sites['USCryoEast01'].id, sites['USCryoWest01'].id, sites['CACryoTech01'].id,
  ]
  const holidayData: { name: string; date: Date; siteIds: number[] }[] = [
    { name: 'Memorial Day', date: new Date('2026-05-25'), siteIds: [sites['USBioMfgE01'].id, sites['USBioMfgW01'].id, sites['USCryoEast01'].id, sites['USCryoWest01'].id] },
    { name: 'Canada Day', date: new Date('2026-07-01'), siteIds: [sites['CABioMfg01'].id, sites['CACryoTech01'].id] },
    { name: 'Independence Day', date: new Date('2026-07-04'), siteIds: [sites['USBioMfgE01'].id, sites['USBioMfgW01'].id, sites['USCryoEast01'].id, sites['USCryoWest01'].id] },
    { name: 'Independence Day (Observed)', date: new Date('2026-07-03'), siteIds: [sites['USBioMfgE01'].id, sites['USBioMfgW01'].id] },
    { name: 'Civic Holiday', date: new Date('2026-08-03'), siteIds: [sites['CABioMfg01'].id, sites['CACryoTech01'].id] },
    { name: 'Labor Day', date: new Date('2026-09-07'), siteIds: allMfgCryoSiteIds },
    { name: 'Site Maintenance Day - MfgE', date: new Date('2026-06-15'), siteIds: [sites['USBioMfgE01'].id] },
    { name: 'Site Maintenance Day - MfgW', date: new Date('2026-06-22'), siteIds: [sites['USBioMfgW01'].id] },
  ]
  let holidayCount = 0
  for (const h of holidayData) {
    for (const sid of h.siteIds) {
      await prisma.holiday.create({ data: { name: h.name, date: h.date, accountId: sid, active: true } })
      holidayCount++
    }
  }
  console.log(`  ${holidayCount} Holidays created`)

  // =====================================================
  // 5. SITE RELATIONSHIPS (14 chains)
  // =====================================================
  const relationshipData = [
    // US East chains
    { name: 'Moffitt→CryoEast→MfgEast', aphId: 'USMoffit01', cryoId: 'USCryoEast01', cryoPref: 'Primary', mfgId: 'USBioMfgE01', mfgPref: 'Primary', wdcId: 'USWDCE01', infId: 'USMSK01' },
    { name: 'Moffitt→CryoWest→MfgWest', aphId: 'USMoffit01', cryoId: 'USCryoWest01', cryoPref: 'Secondary', mfgId: 'USBioMfgW01', mfgPref: 'Secondary', wdcId: 'USWDCW01', infId: 'USCedars01' },
    { name: 'DanaFarber→CryoEast→MfgEast', aphId: 'USDanaFarber01', cryoId: 'USCryoEast01', cryoPref: 'Primary', mfgId: 'USBioMfgE01', mfgPref: 'Primary', wdcId: 'USWDCE01', infId: 'USMSK01' },
    { name: 'DanaFarber→CryoWest→MfgWest', aphId: 'USDanaFarber01', cryoId: 'USCryoWest01', cryoPref: 'Secondary', mfgId: 'USBioMfgW01', mfgPref: 'Secondary', wdcId: null, infId: 'USMayo01' },
    // US West chains
    { name: 'MDAnderson→CryoWest→MfgWest', aphId: 'USMDAnderson01', cryoId: 'USCryoWest01', cryoPref: 'Primary', mfgId: 'USBioMfgW01', mfgPref: 'Primary', wdcId: 'USWDCW01', infId: 'USCedars01' },
    { name: 'MDAnderson→CryoEast→MfgEast', aphId: 'USMDAnderson01', cryoId: 'USCryoEast01', cryoPref: 'Secondary', mfgId: 'USBioMfgE01', mfgPref: 'Secondary', wdcId: 'USWDCE01', infId: 'USMayo01' },
    // Canada chains
    { name: 'PrinMarg→CryoCanada→MfgCanada', aphId: 'CAPrinMarg01', cryoId: 'CACryoTech01', cryoPref: 'Primary', mfgId: 'CABioMfg01', mfgPref: 'Primary', wdcId: null, infId: 'CATorGen01' },
    { name: 'PrinMarg→CryoEast→MfgEast', aphId: 'CAPrinMarg01', cryoId: 'USCryoEast01', cryoPref: 'Secondary', mfgId: 'USBioMfgE01', mfgPref: 'Secondary', wdcId: 'USWDCE01', infId: 'CATorGen01' },
    // Brazil chains
    { name: 'Sirio→CryoWest→MfgWest', aphId: 'BRSirio01', cryoId: 'USCryoWest01', cryoPref: 'Primary', mfgId: 'USBioMfgW01', mfgPref: 'Primary', wdcId: 'USWDCW01', infId: 'USCedars01' },
    // Local cryo chains (no cryo site)
    { name: 'MDAnderson→MfgWest-Local', aphId: 'USMDAnderson01', cryoId: null, cryoPref: null, mfgId: 'USBioMfgW01', mfgPref: 'Primary', wdcId: null, infId: 'USCedars01' },
    { name: 'Moffitt→MfgEast-Local', aphId: 'USMoffit01', cryoId: null, cryoPref: null, mfgId: 'USBioMfgE01', mfgPref: 'Primary', wdcId: null, infId: 'USMSK01' },
    // Manufacturing cryo chains
    { name: 'DanaFarber→MfgEast-MfgCryo', aphId: 'USDanaFarber01', cryoId: null, cryoPref: null, mfgId: 'USBioMfgE01', mfgPref: 'Primary', wdcId: 'USWDCE01', infId: 'USMSK01' },
    { name: 'MDAnderson→MfgWest-MfgCryo', aphId: 'USMDAnderson01', cryoId: null, cryoPref: null, mfgId: 'USBioMfgW01', mfgPref: 'Primary', wdcId: 'USWDCW01', infId: 'USMayo01' },
    { name: 'PrinMarg→MfgCanada-MfgCryo', aphId: 'CAPrinMarg01', cryoId: null, cryoPref: null, mfgId: 'CABioMfg01', mfgPref: 'Primary', wdcId: null, infId: 'CATorGen01' },
  ]

  for (const r of relationshipData) {
    await prisma.siteRelationship.create({
      data: {
        name: r.name, active: true,
        aphSiteId: sites[r.aphId].id,
        cryoSiteId: r.cryoId ? sites[r.cryoId].id : null,
        cryoPreference: r.cryoPref,
        mfgSiteId: sites[r.mfgId].id,
        mfgPreference: r.mfgPref,
        wdcSiteId: r.wdcId ? sites[r.wdcId].id : null,
        infusionSiteId: sites[r.infId].id,
        effectiveDate: new Date('2026-01-01'),
      },
    })
  }
  console.log(`  ${relationshipData.length} Site Relationships created`)

  // =====================================================
  // 6. IBP (3 months × 3 mfg sites = 9 records)
  // =====================================================
  const mfgSiteKeys = ['USBioMfgE01', 'USBioMfgW01', 'CABioMfg01']
  const ibpProfiles: Record<string, { com: number; clin: number; np: number; res: number }> = {
    'USBioMfgE01': { com: 70, clin: 35, np: 12, res: 8 },
    'USBioMfgW01': { com: 55, clin: 25, np: 10, res: 6 },
    'CABioMfg01': { com: 30, clin: 20, np: 5, res: 5 },
  }
  for (const mfgKey of mfgSiteKeys) {
    const profile = ibpProfiles[mfgKey]
    for (const m of [5, 6, 7]) {
      await prisma.ibp.create({
        data: {
          name: `${mfgKey}-${m}-2026`,
          mfgSiteId: sites[mfgKey].id, month: m, year: 2026,
          commercialCapacity: profile.com, clinicalCapacity: profile.clin,
          nonPatientCapacity: profile.np, reserveCapacity: profile.res,
        },
      })
    }
  }
  console.log(`  9 IBP records created`)

  // =====================================================
  // 7. MPS (92 days × 3 mfg sites = ~276 records)
  // =====================================================
  let mpsCount = 0
  for (const mfgKey of mfgSiteKeys) {
    const baseCap = mfgKey === 'USBioMfgE01' ? 6 : mfgKey === 'USBioMfgW01' ? 5 : 3
    for (let d = 0; d < 92; d++) {
      const date = new Date(2026, 4, 1 + d) // May 1 through Jul 31
      if (date.getMonth() > 6) continue
      const dow = date.getDay()
      const isWeekend = dow === 0 || dow === 6
      const patientCap = isWeekend ? Math.max(1, baseCap - 3) : baseCap
      const npCap = isWeekend ? 0 : 1
      await prisma.mps.create({
        data: {
          name: `${mfgKey}-${date.toISOString().split('T')[0]}`,
          mfgSiteId: sites[mfgKey].id, date,
          patientCapacity: patientCap, nonPatientCapacity: npCap,
        },
      })
      mpsCount++
    }
  }
  console.log(`  ${mpsCount} MPS records created`)

  // =====================================================
  // 8. GDLT (12 records)
  // =====================================================
  const gdltData = [
    { name: 'Moffitt-CA1', siteId: 'USMoffit01', prodIdx: 0, mfgType: 'Frozen', min: 1, max: 3, exact: null },
    { name: 'Moffitt-CA2', siteId: 'USMoffit01', prodIdx: 1, mfgType: 'Fresh & Frozen', min: 1, max: 2, exact: 1 },
    { name: 'MDAnderson-CA1', siteId: 'USMDAnderson01', prodIdx: 0, mfgType: 'Frozen', min: 2, max: 4, exact: null },
    { name: 'MDAnderson-CA2', siteId: 'USMDAnderson01', prodIdx: 1, mfgType: 'Fresh & Frozen', min: 1, max: 3, exact: 1 },
    { name: 'MDAnderson-TCR3', siteId: 'USMDAnderson01', prodIdx: 2, mfgType: 'Fresh', min: null, max: null, exact: 1 },
    { name: 'DanaFarber-CA1', siteId: 'USDanaFarber01', prodIdx: 0, mfgType: 'Frozen', min: 1, max: 2, exact: null },
    { name: 'DanaFarber-NK4', siteId: 'USDanaFarber01', prodIdx: 3, mfgType: 'Frozen', min: 2, max: 4, exact: null },
    { name: 'PrinMarg-CA1', siteId: 'CAPrinMarg01', prodIdx: 0, mfgType: 'Frozen', min: 2, max: 5, exact: null },
    { name: 'PrinMarg-CA2', siteId: 'CAPrinMarg01', prodIdx: 1, mfgType: 'Fresh & Frozen', min: 2, max: 4, exact: 2 },
    { name: 'Sirio-CA2', siteId: 'BRSirio01', prodIdx: 1, mfgType: 'Fresh & Frozen', min: 3, max: 6, exact: 2 },
    { name: 'Sirio-CA1', siteId: 'BRSirio01', prodIdx: 0, mfgType: 'Frozen', min: 3, max: 7, exact: null },
    { name: 'DanaFarber-CA2', siteId: 'USDanaFarber01', prodIdx: 1, mfgType: 'Fresh & Frozen', min: 1, max: 3, exact: 1 },
  ]
  for (const g of gdltData) {
    await prisma.gdlt.create({
      data: { name: g.name, siteId: sites[g.siteId].id, productId: products[g.prodIdx].id, mfgType: g.mfgType, exactLt: g.exact, minLt: g.min, maxLt: g.max },
    })
  }
  console.log(`  ${gdltData.length} GDLT records created`)

  // =====================================================
  // 9. LTM CONFIG - Central milestones for main care program + Local + Mfg
  // =====================================================
  const centralMilestones = [
    { name: 'Order Booking Date', leg: 1, ul: 'Creation Date', lt: null, nwd: null },
    { name: 'Apheresis Completed', leg: 2, ul: 'Collection Date', lt: null, nwd: null },
    { name: 'Apheresis Picked Up', leg: 3, ul: 'Collection Date', lt: null, nwd: null },
    { name: 'Aph Received at Central Cryo', leg: 4, ul: 'Lead Time', lt: 1, nwd: null },
    { name: 'Cryopreservation Completed', leg: 5, ul: 'Cryopreservation Daily Capacity', lt: 1, nwd: null },
    { name: 'Cryo Picked Up', leg: 6, ul: 'Lead Time', lt: 1, nwd: 'Sat,Sun' },
    { name: 'Aph Received at Manufacturing', leg: 7, ul: 'Lead Time', lt: 1, nwd: null },
    { name: 'Apheresis Released', leg: 8, ul: 'Lead Time', lt: 1, nwd: null },
    { name: 'Manufacturing Started', leg: 9, ul: 'Manufacturing Daily Capacity', lt: 2, nwd: null },
    { name: 'Manufacturing Completed', leg: 10, ul: 'Lead Time', lt: 10, nwd: null },
    { name: 'FP Released', leg: 11, ul: 'Lead Time', lt: 12, nwd: null },
    { name: 'FP Shipped from Manufacturing', leg: 12, ul: 'Lead Time', lt: 2, nwd: 'Sat,Sun' },
    { name: 'FP Delivered at Infusion', leg: 13, ul: 'Lead Time', lt: 1, nwd: null },
  ]

  let ltmCount = 0
  // Create for top 4 care programs (Central)
  for (const cpIdx of [0, 1, 2, 3]) {
    for (const ms of centralMilestones) {
      await prisma.ltmConfig.create({
        data: {
          milestoneName: ms.name, leg: ms.leg, careProgramId: carePrograms[cpIdx].id,
          cryoTypes: 'Central', wdcApplicable: false, active: true,
          cryoLeadTime: ms.lt, updateLogicCentral: ms.ul, centralApplicability: 'Applicable',
          nonWorkingDay: ms.nwd,
        },
      })
      ltmCount++
    }
  }

  // Local cryo milestones (simplified - skip cryo legs)
  const localMilestones = [
    { name: 'Order Booking Date', leg: 1, ul: 'Creation Date', lt: null },
    { name: 'Apheresis Completed', leg: 2, ul: 'Collection Date', lt: null },
    { name: 'Apheresis Picked Up', leg: 3, ul: 'Collection Date', lt: null },
    { name: 'Aph Received at Manufacturing', leg: 4, ul: 'Lead Time', lt: 2 },
    { name: 'Apheresis Released', leg: 5, ul: 'Lead Time', lt: 1 },
    { name: 'Manufacturing Started', leg: 6, ul: 'Manufacturing Daily Capacity', lt: 2 },
    { name: 'Manufacturing Completed', leg: 7, ul: 'Lead Time', lt: 10 },
    { name: 'FP Released', leg: 8, ul: 'Lead Time', lt: 12 },
    { name: 'FP Shipped from Manufacturing', leg: 9, ul: 'Lead Time', lt: 2 },
    { name: 'FP Delivered at Infusion', leg: 10, ul: 'Lead Time', lt: 1 },
  ]
  for (const cpIdx of [0, 1]) {
    for (const ms of localMilestones) {
      await prisma.ltmConfig.create({
        data: {
          milestoneName: ms.name, leg: ms.leg, careProgramId: carePrograms[cpIdx].id,
          cryoTypes: 'Local', wdcApplicable: false, active: true,
          localLeadTime: ms.lt, updateLogicLocal: ms.ul, localApplicability: 'Applicable',
        },
      })
      ltmCount++
    }
  }
  console.log(`  ${ltmCount} LTM Config rows created`)

  // =====================================================
  // 10. DAILY CAPACITY — 3 months × 3 Mfg sites × 4 types + 3 Cryo × 3 types
  // =====================================================
  console.log('  Generating Daily Capacity records (this may take a moment)...')
  let dcCount = 0
  const productCodes = ['CA1', 'CA2']

  // MFG capacity
  for (const mfgKey of mfgSiteKeys) {
    const site = sites[mfgKey]
    const ibpProfile = ibpProfiles[mfgKey]
    const totalPatient = ibpProfile.com + ibpProfile.clin + ibpProfile.res
    const pctCom = ibpProfile.com / totalPatient
    const pctClin = ibpProfile.clin / totalPatient

    for (let d = 0; d < 92; d++) {
      const date = new Date(2026, 4, 1 + d)
      if (date.getMonth() > 6) continue
      const dow = date.getDay()
      const isWeekend = dow === 0 || dow === 6
      const baseCap = mfgKey === 'USBioMfgE01' ? 6 : mfgKey === 'USBioMfgW01' ? 5 : 3
      const dailyCap = isWeekend ? Math.max(1, baseCap - 3) : baseCap
      const dateStr = formatDateShort(date)

      for (const pc of productCodes) {
        const com = Math.round(dailyCap * pctCom)
        const clin = Math.round(dailyCap * pctClin)
        const res = Math.max(0, dailyCap - com - clin)
        const np = isWeekend ? 0 : 1
        const mfgType = mfgKey === 'USBioMfgW01' ? (dow % 2 === 0 ? 'Fresh' : 'Frozen') : 'Frozen'

        const types = [
          { type: 'Commercial', abbr: 'COM', base: com },
          { type: 'Clinical', abbr: 'CLIN', base: clin },
          { type: 'Reserve', abbr: 'RES', base: res },
          { type: 'Non-patient', abbr: 'NP', base: np },
        ]
        for (const t of types) {
          // Simulate some bookings (more bookings for earlier dates)
          const daysSinceStart = d
          const bookingRate = daysSinceStart < 30 ? 0.7 : daysSinceStart < 60 ? 0.4 : 0.15
          const booked = t.type === 'Non-patient' || t.type === 'Reserve' ? 0 : Math.min(t.base, Math.floor(t.base * bookingRate * (0.5 + Math.random())))

          await prisma.dailyCapacity.create({
            data: {
              name: `${dateStr}-${site.alias}-${t.abbr}-${pc}`,
              date, capacityType: t.type, siteType: 'Manufacturing',
              baseCapacity: t.base, bookedCapacity: booked, overallocationCapacity: 0,
              remainingCapacity: t.base - booked,
              mfgType, siteId: site.id, productCode: pc,
            },
          })
          dcCount++
        }
      }
    }
  }

  // CRYO capacity
  const cryoSiteKeys = ['USCryoEast01', 'USCryoWest01', 'CACryoTech01']
  const cryoBaseCaps: Record<string, number> = { 'USCryoEast01': 8, 'USCryoWest01': 6, 'CACryoTech01': 4 }

  for (const cryoKey of cryoSiteKeys) {
    const site = sites[cryoKey]
    const base = cryoBaseCaps[cryoKey]
    for (let d = 0; d < 92; d++) {
      const date = new Date(2026, 4, 1 + d)
      if (date.getMonth() > 6) continue
      const dow = date.getDay()
      const isWeekend = dow === 0 || dow === 6
      const dateStr = formatDateShort(date)

      const patBase = isWeekend ? Math.max(1, base - 4) : base
      const resBase = isWeekend ? 0 : 1
      const daysSinceStart = d
      const bookingRate = daysSinceStart < 30 ? 0.6 : daysSinceStart < 60 ? 0.3 : 0.1
      const patBooked = Math.min(patBase, Math.floor(patBase * bookingRate * (0.5 + Math.random())))

      for (const t of [
        { type: 'Patient', abbr: 'PAT', base: patBase, booked: patBooked },
        { type: 'Reserve', abbr: 'RES', base: resBase, booked: 0 },
        { type: 'Non-patient', abbr: 'NP', base: 0, booked: 0 },
      ]) {
        await prisma.dailyCapacity.create({
          data: {
            name: `${dateStr}-${t.abbr}-${site.alias}`,
            date, capacityType: t.type, siteType: 'Cryopreservation',
            baseCapacity: t.base, bookedCapacity: t.booked, overallocationCapacity: 0,
            remainingCapacity: t.base - t.booked,
            siteId: site.id,
          },
        })
        dcCount++
      }
    }
  }
  console.log(`  ${dcCount} Daily Capacity records created`)

  // =====================================================
  // 11. ORDER RESERVATIONS (~180 orders across 3 months)
  // =====================================================
  console.log('  Generating Orders and Milestones...')
  const statuses = ['Booked', 'In Progress', 'Completed', 'Cancelled', 'On Hold']
  const cryoTypes: ('Central' | 'Local' | 'Manufacturing')[] = ['Central', 'Local', 'Manufacturing']
  const aphSiteKeys = ['USMoffit01', 'USMDAnderson01', 'USDanaFarber01', 'CAPrinMarg01', 'BRSirio01']

  // Get Mfg capacity records for booking
  const mfgCapRecords = await prisma.dailyCapacity.findMany({
    where: { siteType: 'Manufacturing', capacityType: 'Commercial', remainingCapacity: { gt: 0 } },
    orderBy: { date: 'asc' },
    take: 500,
  })
  const cryoCapRecords = await prisma.dailyCapacity.findMany({
    where: { siteType: 'Cryopreservation', capacityType: 'Patient', remainingCapacity: { gt: 0 } },
    orderBy: { date: 'asc' },
    take: 500,
  })

  let orderCount = 0
  let milestoneCount = 0
  const mfgCapIdx = { current: 0 }
  const cryoCapIdx = { current: 0 }

  for (let i = 0; i < 180; i++) {
    const aphKey = randomPick(aphSiteKeys)
    const aphSite = sites[aphKey]
    const prodIdx = randomInt(0, 1)
    const product = products[prodIdx]
    const cryoType = randomPick(cryoTypes)
    const therapyType = Math.random() > 0.3 ? 'Commercial' : 'Clinical'
    const country = aphKey.startsWith('US') ? 'US' : aphKey.startsWith('CA') ? 'CA' : 'BR'

    // Pick mfg capacity
    if (mfgCapIdx.current >= mfgCapRecords.length) break
    const mfgCap = mfgCapRecords[mfgCapIdx.current++]

    // Pick cryo capacity (for Central type)
    let cryoCap = null
    if (cryoType === 'Central' && cryoCapIdx.current < cryoCapRecords.length) {
      cryoCap = cryoCapRecords[cryoCapIdx.current++]
    }

    // Determine status based on date
    const mfgDate = new Date(mfgCap.date)
    const now = new Date('2026-04-12')
    const daysOut = (mfgDate.getTime() - now.getTime()) / 86400000
    let status: string
    if (Math.random() < 0.05) status = 'Cancelled'
    else if (Math.random() < 0.05) status = 'On Hold'
    else if (daysOut < -10) status = 'Completed'
    else if (daysOut < 20) status = 'In Progress'
    else status = 'Booked'

    const mfgSiteId = mfgCap.siteId
    const cryoSiteId = cryoCap?.siteId || null
    const infSiteKey = country === 'CA' ? 'CATorGen01' : randomPick(['USMSK01', 'USMayo01', 'USCedars01'])
    const wdcSiteKey = Math.random() > 0.5 ? (aphKey.startsWith('US') ? (Math.random() > 0.5 ? 'USWDCE01' : 'USWDCW01') : null) : null

    const aphPickup = addDays(mfgDate, -randomInt(10, 25))
    const createdAt = addDays(aphPickup, -randomInt(1, 5))

    const order = await prisma.orderReservation.create({
      data: {
        status,
        country,
        productId: product.id,
        therapyType,
        cryoType,
        mfgCapacityId: mfgCap.id,
        cryoCapacityId: cryoCap?.id || null,
        originalPdd: addDays(mfgDate, 30),
        plannedPdd: addDays(mfgDate, 30 + (status === 'In Progress' ? randomInt(-2, 5) : 0)),
        aphSiteId: aphSite.id,
        cryoSiteId: cryoSiteId,
        mfgSiteId: mfgSiteId,
        wdcSiteId: wdcSiteKey ? sites[wdcSiteKey].id : null,
        infusionSiteId: sites[infSiteKey].id,
        aphPickupDate: aphPickup,
        createdAt,
      },
    })
    orderCount++

    // Generate milestones
    const milestoneTemplates = cryoType === 'Central' ? centralMilestones : localMilestones
    let prevDate = new Date(createdAt)

    for (let mi = 0; mi < milestoneTemplates.length; mi++) {
      const mt = milestoneTemplates[mi]
      let plannedDate: Date

      switch (mt.ul) {
        case 'Creation Date': plannedDate = new Date(createdAt); break
        case 'Collection Date': plannedDate = new Date(aphPickup); break
        case 'Cryopreservation Daily Capacity': plannedDate = cryoCap ? new Date(cryoCap.date) : new Date(aphPickup); break
        case 'Manufacturing Daily Capacity': plannedDate = new Date(mfgDate); break
        case 'Lead Time':
          plannedDate = addDays(prevDate, mt.lt || 1)
          if (mt.nwd) plannedDate = skipWeekends(plannedDate)
          break
        default: plannedDate = new Date(createdAt)
      }

      // Determine actual date based on order status
      let actualDate: Date | null = null
      const isEarlyMilestone = mi < milestoneTemplates.length * 0.5
      const isMidMilestone = mi < milestoneTemplates.length * 0.8

      if (status === 'Completed') {
        actualDate = addDays(plannedDate, randomInt(-1, 2))
      } else if (status === 'In Progress') {
        if (isEarlyMilestone) {
          actualDate = addDays(plannedDate, randomInt(-1, 3))
        } else if (isMidMilestone && Math.random() > 0.5) {
          actualDate = addDays(plannedDate, randomInt(0, 2))
        }
      } else if (status === 'Booked') {
        if (mi < 3 && daysOut < 40) {
          actualDate = addDays(plannedDate, randomInt(-1, 1))
        }
      }

      await prisma.orderMilestone.create({
        data: {
          orderReservationId: order.id,
          milestoneName: mt.name,
          leg: mt.leg,
          sequentialLeg: mi + 1,
          plannedDate,
          actualDate,
        },
      })
      milestoneCount++
      prevDate = plannedDate
    }
  }
  console.log(`  ${orderCount} Orders created`)
  console.log(`  ${milestoneCount} Milestones created`)

  // =====================================================
  // 12. UTILIZATION & QUEUE TABLES — per product
  // =====================================================
  let utilCount = 0
  const weeks = ['W1-May-2026', 'W2-May-2026', 'W3-May-2026', 'W4-May-2026',
    'W1-Jun-2026', 'W2-Jun-2026', 'W3-Jun-2026', 'W4-Jun-2026',
    'W1-Jul-2026', 'W2-Jul-2026', 'W3-Jul-2026', 'W4-Jul-2026']
  const months = ['May-2026', 'Jun-2026', 'Jul-2026']
  const seedProductCodes = ['CA1', 'CA2']

  for (const mfgKey of mfgSiteKeys) {
    const siteName = sites[mfgKey].name
    for (const pc of seedProductCodes) {
      // Weekly util targets per product
      for (const w of weeks) {
        await prisma.utilizationQueue.create({
          data: {
            dateRangeType: 'Weekly', dateRangeValue: w,
            siteType: 'Manufacturing', siteName, productCode: pc,
            minUtilizationTarget: randomInt(80, 95),
            currentUtilization: randomInt(50, 100) as number,
            maxAphReceipts: randomInt(5, 12),
            currentAphReceipts: randomInt(1, 10),
          },
        })
        utilCount++
      }
      // Monthly util targets per product
      for (const m of months) {
        await prisma.utilizationQueue.create({
          data: {
            dateRangeType: 'Monthly', dateRangeValue: m,
            siteType: 'Manufacturing', siteName, productCode: pc,
            minUtilizationTarget: randomInt(85, 98),
            currentUtilization: randomInt(60, 100) as number,
          },
        })
        utilCount++
      }
    }
  }

  for (const cryoKey of cryoSiteKeys) {
    const siteName = sites[cryoKey].name
    for (const pc of seedProductCodes) {
      for (const w of weeks) {
        await prisma.utilizationQueue.create({
          data: {
            dateRangeType: 'Weekly', dateRangeValue: w,
            siteType: 'Cryopreservation', siteName, productCode: pc,
            minUtilizationTarget: randomInt(75, 92),
            currentUtilization: randomInt(40, 95) as number,
          },
        })
        utilCount++
      }
    }
  }
  console.log(`  ${utilCount} Utilization/Queue records created`)

  // =====================================================
  // 13. AUDIT LOG - sample entries
  // =====================================================
  const auditActions = ['create', 'update', 'generate', 'book', 'reschedule', 'cancel']
  const auditObjects = ['Product', 'CareProgram', 'DailyCapacity', 'OrderReservation', 'LtmConfig']
  const auditUsers = ['admin@atsm.com', 'planner1@atsm.com', 'planner2@atsm.com', 'ops1@atsm.com', 'system']

  for (let a = 0; a < 50; a++) {
    await prisma.auditLog.create({
      data: {
        objectType: randomPick(auditObjects),
        recordId: String(randomInt(1, 200)),
        action: randomPick(auditActions),
        field: Math.random() > 0.5 ? randomPick(['status', 'baseCapacity', 'bookedCapacity', 'active', 'plannedPdd']) : null,
        oldValue: Math.random() > 0.5 ? String(randomInt(0, 10)) : null,
        newValue: String(randomInt(1, 15)),
        userId: randomPick(auditUsers),
        timestamp: addDays(new Date('2026-04-01'), randomInt(0, 11)),
      },
    })
  }
  console.log(`  50 Audit Log entries created`)

  console.log('\n=== FULL SEED COMPLETE ===')
  console.log(`  Products: ${products.length}`)
  console.log(`  Care Programs: ${carePrograms.length}`)
  console.log(`  Sites: ${Object.keys(sites).length}`)
  console.log(`  Holidays: ${holidayCount}`)
  console.log(`  Site Relationships: ${relationshipData.length}`)
  console.log(`  IBP: 9`)
  console.log(`  MPS: ${mpsCount}`)
  console.log(`  GDLT: ${gdltData.length}`)
  console.log(`  LTM Config: ${ltmCount}`)
  console.log(`  Daily Capacity: ${dcCount}`)
  console.log(`  Orders: ${orderCount}`)
  console.log(`  Milestones: ${milestoneCount}`)
  console.log(`  Utilization/Queue: ${utilCount}`)
  console.log(`  Audit Logs: 50`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
