import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

export default function DonationDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/donations/${id}`).then((res) => setData(res.data));
  }, [id]);

  if (!data) return <div className="mx-auto max-w-4xl p-4"><div className="card animate-pulse h-48" /></div>;

  return (
    <div className="mx-auto max-w-4xl p-4">
      <article className="card grid gap-4 md:grid-cols-2">
        <img
          src={data.image || "https://images.unsplash.com/photo-1490645935967-10de6ba17061"}
          alt={data.foodName}
          className="h-64 w-full rounded-xl object-cover"
        />
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">{data.foodName}</h1>
          <p>{data.description || "No description provided"}</p>
          <p><strong>Quantity:</strong> {data.quantity}</p>
          <p><strong>Address:</strong> {data.address}</p>
          <p><strong>Expiry:</strong> {new Date(data.expiryTime).toLocaleString()}</p>
          <p><strong>Pickup:</strong> {data.pickupInstructions || "Contact donor for details."}</p>
          <p><strong>Donor:</strong> {data.donor?.name} ({data.donor?.phone || data.donor?.email})</p>
        </div>
      </article>
    </div>
  );
}

