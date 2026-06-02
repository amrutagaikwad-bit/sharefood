import { Clock3, MapPin, Package, Users } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function DonationCard({ donation, onRequest, canRequest }) {
  return (
    <article className="card fade-in overflow-hidden p-0">
      <img
        src={donation.image || "https://images.unsplash.com/photo-1498837167922-ddd27525d352"}
        alt={donation.foodName}
        className="h-44 w-full object-cover"
      />
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold">{donation.foodName}</h3>
          <StatusBadge status={donation.status} />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {donation.description || "Fresh food available for community pickup."}
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="flex items-center gap-1"><Package size={14} /> {donation.quantity}</p>
          <p className="flex items-center gap-1">
            <Users size={14} />
            <span className="font-semibold text-primary">{donation.servingsRemaining ?? donation.servesCount}</span>
            / {donation.servesCount || 1} servings left
          </p>
          <p className="col-span-2 flex items-center gap-1"><MapPin size={14} /> {donation.address}</p>
          <p className="flex items-center gap-1"><Clock3 size={14} /> {new Date(donation.createdAt).toLocaleString()}</p>
          {donation.distanceKm !== undefined && (
            <p className="font-medium text-primary">
              {donation.distanceKm.toFixed(2)} km
              {donation.walkingTimeMinutes ? ` • ${donation.walkingTimeMinutes} min walk` : ""}
            </p>
          )}
        </div>
        {donation.pickupEnd && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Pickup by: {new Date(donation.pickupEnd).toLocaleString()}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link className="btn-secondary text-sm" to={`/donations/${donation.id}`}>View Details</Link>
          {canRequest && donation.status === "ACTIVE" && (
            <button className="btn-primary text-sm" onClick={() => onRequest(donation.id)}>
              Request Pickup
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
