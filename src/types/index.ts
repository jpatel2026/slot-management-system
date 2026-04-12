export type MfgType = 'Fresh' | 'Frozen' | 'Fresh & Frozen'
export type TherapyType = 'Commercial' | 'Clinical'
export type CryoType = 'Central' | 'Local' | 'Manufacturing'
export type SiteType = 'Treatment' | 'Apheresis' | 'Cryopreservation' | 'Manufacturing' | 'Infusion' | 'Courier' | 'Distribution Center'
export type OrderStatus = 'Booked' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold'
export type Preference = 'Primary' | 'Secondary' | 'Tertiary'
export type MfgCapacityType = 'Commercial' | 'Clinical' | 'Reserve' | 'Non-patient'
export type CryoCapacityType = 'Patient' | 'Reserve' | 'Non-patient'
export type UpdateLogic = 'Creation Date' | 'Collection Date' | 'Lead Time' | 'Cryopreservation Daily Capacity' | 'Manufacturing Daily Capacity'

export interface RulesTable {
  rows: RulesRow[]
}

export interface RulesRow {
  type: string // Commercial, Clinical, Reserve, Non-patient, Fresh, Frozen
  isCheckbox: boolean
  values: Record<string, number | boolean> // day of week -> value
}

export interface AvailabilityRequest {
  aphSiteId: number
  startDate: string
  dateRange: number
  productCode: string
  country: string
  therapyType: TherapyType
  cryoType: CryoType
}

export interface AvailabilityResponse {
  aphDate: string
  cryoCapacityName: string | null
  mfgCapacityName: string
}

export interface BookingRequest {
  aphDate: string
  cryoCapacityName?: string
  mfgCapacityName: string
  country: string
  productCode: string
  therapyType: TherapyType
  cryoType: CryoType
  aphSiteId: number
  cryoSiteId?: number
  mfgSiteId: number
  wdcSiteId?: number
  infusionSiteId: number
  aphPickupDate: string
}
