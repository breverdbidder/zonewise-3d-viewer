export interface FlParcel {
  parcel_id: string
  centroid_lat: number
  centroid_lng: number
  lnd_sqfoot?: number
  tot_lvg_ar?: number
  eff_yr_blt?: number
  no_buldng?: number
  jv?: number
  dor_uc?: string
  phy_addr1?: string
  phy_city?: string
  phy_zipcd?: string
  own_name?: string
}

export interface ParcelZone {
  parcel_id: string
  zone_code?: string
  zone_name?: string
  zone_desc?: string
  future_land_use?: string
  overlay_codes?: string[]
}

export interface ZoneStandards {
  max_height_ft?: number
  max_far?: number
  max_stories?: number
  front_setback_ft?: number
  side_setback_ft?: number
  rear_setback_ft?: number
  max_lot_coverage_pct?: number
  max_density_du_acre?: number
}

export interface PascalSiteNode {
  type: 'site'
  id: string
  area_sqft: number
  lat: number
  lng: number
  front_setback_ft: number
  side_setback_ft: number
  rear_setback_ft: number
}

export interface PascalBuildingNode {
  type: 'building'
  id: string
  parent_id: string
  floors: number
  height_ft: number
  far: number
  footprint_sqft: number
  year_built?: number
}

export interface PascalScene {
  nodes: (PascalSiteNode | PascalBuildingNode)[]
  root_ids: string[]
}

export function parcelToPascalScene(
  parcel: FlParcel,
  zone?: ParcelZone,
  standards?: ZoneStandards
): PascalScene {
  const siteArea = parcel.lnd_sqfoot ?? 0
  const livingArea = parcel.tot_lvg_ar ?? 0
  const floors = siteArea > 0 ? Math.max(1, Math.round(livingArea / siteArea)) : 1
  const heightFt = standards?.max_height_ft ?? floors * 10
  const far = standards?.max_far ?? (siteArea > 0 ? livingArea / siteArea : 1)
  const footprint = far > 0 && heightFt > 0 ? Math.min(siteArea, livingArea / Math.max(1, floors)) : siteArea * 0.4

  const siteId = `site-${parcel.parcel_id}`
  const buildingId = `bldg-${parcel.parcel_id}`

  const siteNode: PascalSiteNode = {
    type: 'site',
    id: siteId,
    area_sqft: siteArea,
    lat: parcel.centroid_lat,
    lng: parcel.centroid_lng,
    front_setback_ft: standards?.front_setback_ft ?? 20,
    side_setback_ft: standards?.side_setback_ft ?? 5,
    rear_setback_ft: standards?.rear_setback_ft ?? 10,
  }

  const buildingNode: PascalBuildingNode = {
    type: 'building',
    id: buildingId,
    parent_id: siteId,
    floors,
    height_ft: heightFt,
    far,
    footprint_sqft: footprint,
    ...(parcel.eff_yr_blt ? { year_built: parcel.eff_yr_blt } : {}),
  }

  return {
    nodes: [siteNode, buildingNode],
    root_ids: [siteId],
  }
}

export function parcelsToPascalScenes(
  parcels: FlParcel[],
  zones: Map<string, ParcelZone>,
  standards: Map<string, ZoneStandards>
): Map<string, PascalScene> {
  const result = new Map<string, PascalScene>()
  for (const parcel of parcels) {
    const zone = zones.get(parcel.parcel_id)
    const std = zone?.zone_code ? standards.get(zone.zone_code) : undefined
    result.set(parcel.parcel_id, parcelToPascalScene(parcel, zone, std))
  }
  return result
}
