"import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from \"react-leaflet\";
import { useMemo } from \"react\";

const COLORS = { low: \"#00FF88\", moderate: \"#F4D03F\", high: \"#FF3B30\" };

export default function VillageMap({ villages = [], onSelect, selectedId }) {
  const center = useMemo(() => {
    if (!villages.length) return [19.0, 75.0];
    const lat = villages.reduce((s, v) => s + v.lat, 0) / villages.length;
    const lng = villages.reduce((s, v) => s + v.lng, 0) / villages.length;
    return [lat, lng];
  }, [villages]);

  return (
    <div className=\"glass p-2 overflow-hidden\" data-testid=\"village-map\">
      <MapContainer center={center} zoom={7} scrollWheelZoom={false} style={{ height: 420, width: \"100%\", borderRadius: 12 }}>
        <TileLayer
          attribution='© OpenStreetMap, © CARTO'
          url=\"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png\"
        />
        {villages.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={selectedId === v.id ? 14 : 9}
            pathOptions={{
              color: COLORS[v.risk],
              fillColor: COLORS[v.risk],
              fillOpacity: 0.55,
              weight: selectedId === v.id ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect && onSelect(v) }}
          >
            <Tooltip direction=\"top\" offset={[0, -8]} opacity={1} className=\"!bg-bg-2 !text-white\">
              <div className=\"text-xs\">
                <div className=\"font-semibold\">{v.name}</div>
                <div className=\"opacity-70\">{v.crop} · {v.risk} risk</div>
                <div className=\"opacity-70\">Yield {v.historical_yield} t/ha · {v.confidence}%</div>
              </div>
            </Tooltip>
            <Popup>
              <div className=\"text-xs\">
                <div className=\"font-semibold\">{v.name}, {v.district}</div>
                <div>Crop: {v.crop}</div>
                <div>Rainfall: {v.avg_rainfall} mm</div>
                <div>Risk: <span style={{color: COLORS[v.risk]}}>{v.risk}</span></div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className=\"flex items-center gap-4 px-3 py-2 text-xs text-white/70\">
        <span className=\"flex items-center gap-1.5\"><i className=\"w-2.5 h-2.5 rounded-full\" style={{background:COLORS.low}}/>Low risk</span>
        <span className=\"flex items-center gap-1.5\"><i className=\"w-2.5 h-2.5 rounded-full\" style={{background:COLORS.moderate}}/>Moderate</span>
        <span className=\"flex items-center gap-1.5\"><i className=\"w-2.5 h-2.5 rounded-full\" style={{background:COLORS.high}}/>High risk</span>
      </div>
    </div>
  );
}
"