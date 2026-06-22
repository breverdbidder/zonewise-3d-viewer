'use client'

import { useEffect, useState } from 'react'
import { parcelToPascalScene } from '@zonewise/pascal-bridge'
import type { FlParcel, ParcelZone, ZoneStandards } from '@zonewise/pascal-bridge'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export default function ParcelPage({
  params,
}: {
  params: { parcel_id: string }
}) {
  const { parcel_id } = params
  const [parcel, setParcel] = useState<FlParcel | null>(null)
  const [zone, setZone] = useState<ParcelZone | null>(null)
  const [standards, setStandards] = useState<ZoneStandards | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [parcelData, zoneData] = await Promise.all([
          fetchJson(
            `${SUPABASE_URL}/rest/v1/fl_parcels?parcel_id=eq.${encodeURIComponent(parcel_id)}&limit=1`
          ),
          fetchJson(
            `${SUPABASE_URL}/rest/v1/parcel_zones?parcel_id=eq.${encodeURIComponent(parcel_id)}&limit=1`
          ),
        ])
        const p = (parcelData as FlParcel[])[0] ?? null
        const z = (zoneData as ParcelZone[])[0] ?? null
        setParcel(p)
        setZone(z)

        if (z?.zone_code) {
          const stdData = await fetchJson(
            `${SUPABASE_URL}/rest/v1/zone_standards?zone_code=eq.${encodeURIComponent(z.zone_code)}&limit=1`
          )
          setStandards((stdData as ZoneStandards[])[0] ?? null)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [parcel_id])

  const scene = parcel ? parcelToPascalScene(parcel, zone ?? undefined, standards ?? undefined) : null

  const estFloors =
    parcel && parcel.lnd_sqfoot && parcel.tot_lvg_ar
      ? Math.max(1, Math.round(parcel.tot_lvg_ar / parcel.lnd_sqfoot))
      : null

  return (
    <div className="min-h-screen bg-[#020617] text-white font-[Inter,sans-serif]">
      {/* Header / Breadcrumb */}
      <header className="border-b border-white/10 px-6 py-4">
        <nav className="text-sm text-white/50 flex items-center gap-2">
          <span className="text-[#F59E0B] font-semibold">ZoneWise.AI</span>
          <span>/</span>
          <span>3D Viewer</span>
          <span>/</span>
          <span className="text-white font-mono">{parcel_id}</span>
          {parcel?.phy_addr1 && (
            <>
              <span>/</span>
              <span className="text-white/70">
                {parcel.phy_addr1}
                {parcel.phy_city ? `, ${parcel.phy_city}` : ''}
                {parcel.phy_zipcd ? ` ${parcel.phy_zipcd}` : ''}
              </span>
            </>
          )}
        </nav>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        {loading && (
          <div className="text-white/50 animate-pulse text-center py-20">
            Loading parcel data…
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-4 py-3 text-red-300">
            Error: {error}
          </div>
        )}

        {!loading && !error && !parcel && (
          <div className="text-white/50 text-center py-20">
            Parcel <span className="font-mono text-white">{parcel_id}</span> not found.
          </div>
        )}

        {parcel && (
          <>
            {/* Metadata Bar */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetaTile label="Just Value" value={parcel.jv != null ? `$${parcel.jv.toLocaleString()}` : '—'} />
              <MetaTile label="Land Sq Ft" value={parcel.lnd_sqfoot != null ? parcel.lnd_sqfoot.toLocaleString() : '—'} />
              <MetaTile label="DOR Code" value={parcel.dor_uc ?? '—'} />
              <MetaTile label="Year Built" value={parcel.eff_yr_blt != null ? String(parcel.eff_yr_blt) : '—'} />
              <MetaTile label="Est. Floors" value={estFloors != null ? String(estFloors) : '—'} accent />
              <MetaTile label="Zone Code" value={zone?.zone_code ?? '—'} accent />
              <MetaTile label="Zone Desc" value={zone?.zone_desc ?? '—'} />
              <MetaTile
                label="Max Height"
                value={standards?.max_height_ft != null ? `${standards.max_height_ft} ft` : '—'}
              />
              <MetaTile
                label="Max FAR"
                value={standards?.max_far != null ? String(standards.max_far) : '—'}
              />
            </section>

            {/* Pascal Scene JSON */}
            <section>
              <h2 className="text-[#F59E0B] font-semibold mb-3 text-sm uppercase tracking-widest">
                Pascal Scene (3D Massing)
              </h2>
              {scene ? (
                <pre className="bg-[#0f172a] border border-white/10 rounded-lg p-4 text-xs text-green-300 overflow-x-auto leading-relaxed">
                  {JSON.stringify(scene, null, 2)}
                </pre>
              ) : (
                <div className="text-white/40 text-sm">Scene unavailable.</div>
              )}
              <p className="mt-3 text-white/30 text-xs">
                Pascal Viewer interactive wire-in — next phase.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function MetaTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3">
      <div className="text-white/40 text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className={`font-semibold text-sm font-mono ${accent ? 'text-[#F59E0B]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}
