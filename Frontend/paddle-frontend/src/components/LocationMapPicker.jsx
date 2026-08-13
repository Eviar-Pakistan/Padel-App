import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [30.3753, 69.3451]; // Pakistan
const DEFAULT_ZOOM = 5;

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [lat, lng, map]);
  return null;
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   latitude?: string | number;
 *   longitude?: string | number;
 *   address?: string;
 *   onChange: (next: { latitude: string; longitude: string; address?: string }) => void;
 * }} props
 */
export default function LocationMapPicker({
  latitude,
  longitude,
  address = "",
  onChange,
}) {
  const [geocoding, setGeocoding] = useState(false);

  const lat = latitude === "" || latitude == null ? null : Number(latitude);
  const lng = longitude === "" || longitude == null ? null : Number(longitude);
  const hasPoint =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const center = useMemo(() => {
    if (hasPoint) return [lat, lng];
    return DEFAULT_CENTER;
  }, [hasPoint, lat, lng]);

  const pick = async (nextLat, nextLng) => {
    const roundedLat = Number(nextLat.toFixed(6));
    const roundedLng = Number(nextLng.toFixed(6));
    onChange({
      latitude: String(roundedLat),
      longitude: String(roundedLng),
      address,
    });

    setGeocoding(true);
    const place = await reverseGeocode(roundedLat, roundedLng);
    setGeocoding(false);
    if (place) {
      onChange({
        latitude: String(roundedLat),
        longitude: String(roundedLng),
        address: place,
      });
    }
  };

  const clear = () => {
    onChange({ latitude: "", longitude: "", address: "" });
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-white/45">Location on map</p>
          <p className="mt-0.5 text-[11px] text-white/35">
            Click the map to drop a pin. Address fills automatically when
            available.
          </p>
        </div>
        {hasPoint && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-white/45 hover:text-white/70"
          >
            Clear pin
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <MapContainer
          center={center}
          zoom={hasPoint ? 14 : DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-64 w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={pick} />
          {hasPoint && <Recenter lat={lat} lng={lng} />}
          {hasPoint && <Marker position={[lat, lng]} icon={markerIcon} />}
        </MapContainer>
      </div>

      <input
        className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40"
        placeholder="Address (auto-filled from map, editable)"
        value={address}
        onChange={(e) =>
          onChange({
            latitude: latitude ?? "",
            longitude: longitude ?? "",
            address: e.target.value,
          })
        }
      />

      <div className="flex flex-wrap gap-3 text-[11px] text-white/40">
        {hasPoint ? (
          <>
            <span className="font-mono">
              Lat {Number(lat).toFixed(6)} · Lng {Number(lng).toFixed(6)}
            </span>
            {geocoding && <span>Looking up address…</span>}
          </>
        ) : (
          <span>No location selected yet</span>
        )}
      </div>
    </div>
  );
}
