import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const donorIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function Recenter({ center }) {
  const map = useMap();
  if (center) map.setView(center, map.getZoom(), { animate: true });
  return null;
}

export default function MapView({ userLocation, donations }) {
  const center = userLocation || [20.5937, 78.9629];
  return (
    <MapContainer center={center} zoom={12} className="h-[420px] w-full rounded-2xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {userLocation && (
        <>
          <Circle center={userLocation} radius={1000} pathOptions={{ color: "#2E7D32", fillOpacity: 0.08 }} />
          <Circle center={userLocation} radius={5000} pathOptions={{ color: "#66BB6A", fillOpacity: 0.05 }} />
          <Circle center={userLocation} radius={10000} pathOptions={{ color: "#FFA726", fillOpacity: 0.03 }} />
        </>
      )}
      {donations.map((d) => (
        <Marker key={d.id} position={[d.latitude, d.longitude]} icon={donorIcon}>
          <Popup>
            <div className="space-y-1">
              <strong>{d.foodName}</strong>
              <p>{d.quantity}</p>
              <p>{d.address}</p>
              {d.distanceKm !== undefined && <p>{d.distanceKm.toFixed(2)} km away</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

