import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [30.3753, 69.3451];

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

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

/**
 * Read-only map showing a fixed location marker.
 */
export default function LocationMapView({
  latitude,
  longitude,
  className = "h-56 w-full rounded-2xl",
}) {
  const lat = latitude == null || latitude === "" ? null : Number(latitude);
  const lng = longitude == null || longitude === "" ? null : Number(longitude);
  const hasPoint =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const center = useMemo(() => {
    if (hasPoint) return [lat, lng];
    return DEFAULT_CENTER;
  }, [hasPoint, lat, lng]);

  if (!hasPoint) {
    return (
      <div
        className={`flex items-center justify-center border border-white/10 bg-[#0e1821] text-sm text-white/40 ${className}`}
      >
        Location not set for this court
      </div>
    );
  }

  return (
    <div className={`overflow-hidden border border-white/10 ${className}`}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: "#0e1821" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon} />
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
