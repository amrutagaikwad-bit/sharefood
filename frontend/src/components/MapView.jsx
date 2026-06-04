import { useEffect } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";

const donorIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const completedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function ClusterLayer({ donations, onSelect }) {
  const map = useMap();

  useEffect(() => {
    const cluster = L.markerClusterGroup();
    donations.forEach((d) => {
      const icon = d.status === "COMPLETED" ? completedIcon : donorIcon;
      const marker = L.marker([d.latitude, d.longitude], { icon });
      const start = d.pickupStart ? new Date(d.pickupStart).toLocaleString() : "";
      const end = d.pickupEnd ? new Date(d.pickupEnd).toLocaleString() : "";
      const dist = d.distanceKm !== undefined ? `${d.distanceKm.toFixed(2)} km away` : "";
      marker.bindPopup(
        `<div style="min-width:200px">
          <strong>${d.foodName}</strong> (${d.category || ""})<br/>
          ${d.description ? `${d.description}<br/>` : ""}
          <b>${d.servingsRemaining ?? d.servesCount}</b> / ${d.servesCount} servings • ${d.quantity}<br/>
          ${start && end ? `Pickup: ${start} – ${end}<br/>` : ""}
          ${d.address}<br/>
          ${dist}
          <br/><a href="/donations/${d.id}">View full details</a>
        </div>`
      );
      marker.on("click", () => onSelect?.(d));
      cluster.addLayer(marker);
    });
    map.addLayer(cluster);
    return () => map.removeLayer(cluster);
  }, [donations, map, onSelect]);

  return null;
}

export default function MapView({ userLocation, donations, onSelect, showRanges = true }) {
  const center = userLocation || [20.5937, 78.9629];

  return (
    <MapContainer center={center} zoom={13} className="h-[480px] w-full rounded-2xl shadow-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {userLocation && showRanges && (
        <>
          <Circle center={userLocation} radius={1000} pathOptions={{ color: "#2E7D32", fillOpacity: 0.1 }} />
          <Circle center={userLocation} radius={3000} pathOptions={{ color: "#66BB6A", fillOpacity: 0.07 }} />
          <Circle center={userLocation} radius={5000} pathOptions={{ color: "#66BB6A", fillOpacity: 0.05 }} />
          <Circle center={userLocation} radius={10000} pathOptions={{ color: "#FFA726", fillOpacity: 0.04 }} />
          <Circle center={userLocation} radius={25000} pathOptions={{ color: "#FFA726", fillOpacity: 0.02 }} />
        </>
      )}
      {userLocation && (
        <Marker position={userLocation}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      <ClusterLayer donations={donations} onSelect={onSelect} />
    </MapContainer>
  );
}
