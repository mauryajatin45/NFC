import { Globe, MapPin } from "lucide-react";

const topLocations = [
  { city: "New York, USA", count: 234 },
  { city: "Los Angeles, USA", count: 187 },
  { city: "London, UK", count: 156 },
  { city: "Paris, France", count: 98 },
  { city: "Tokyo, Japan", count: 76 },
];

const totalDeliveries = topLocations.reduce((sum, loc) => sum + loc.count, 0);

export function GlobalVerificationMap() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Globe size={18} className="text-foreground" strokeWidth={1.5} />
        <h2 className="font-heading text-base font-semibold">Global Verification Map</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {totalDeliveries.toLocaleString()} verified deliveries across {topLocations.length} cities
      </p>

      {/* Static Map Image */}
      <div className="rounded-xl overflow-hidden mb-5 h-48 bg-[#b8d4e3] relative">
        <iframe
          title="Global Verification Map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-180,-60,180,80&layer=mapnik"
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>

      {/* Top Locations */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Locations</p>
        <div className="space-y-3">
          {topLocations.map((location) => (
            <div key={location.city} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground" />
                <span className="text-sm">{location.city}</span>
              </div>
              <span className="font-mono text-sm">{location.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
