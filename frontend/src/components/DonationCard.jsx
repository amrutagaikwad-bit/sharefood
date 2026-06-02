import { Clock3, MapPin, Package, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

export default function DonationCard({ donation, onRequest, canRequest }) {
  return (
    <article className="card">
      <img
        src={donation.image || "https://images.unsplash.com/photo-1498837167922-ddd27525d352"}
        alt={donation.foodName}
        className="h-40 w-full rounded-xl object-cover"
      />
      <div className="mt-4 space-y-2">
        <h3 className="text-lg font-semibold">{donation.foodName}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{donation.description || "Fresh food available for pickup."}</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p className="flex items-center gap-1"><Package size={14} /> {donation.quantity}</p>
          <p className="flex items-center gap-1"><UserRound size={14} /> {donation?.donor?.name || "Donor"}</p>
          <p className="col-span-2 flex items-center gap-1"><MapPin size={14} /> {donation.address}</p>
          <p className="flex items-center gap-1"><Clock3 size={14} /> {new Date(donation.createdAt).toLocaleString()}</p>
          {donation.distanceKm !== undefined && (
            <p className="text-primary">
              {donation.distanceKm.toFixed(2)} km away
              {donation.walkingTimeMinutes ? ` • ${donation.walkingTimeMinutes} min walk` : ""}
            </p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link className="btn-secondary text-sm" to={`/donations/${donation.id}`}>View Details</Link>
          {canRequest && <button className="btn-primary text-sm" onClick={onRequest}>Request Pickup</button>}
        </div>
      </div>
    </article>
  );
}

