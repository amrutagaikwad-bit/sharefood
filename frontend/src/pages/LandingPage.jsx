import { ArrowRight, HandHeart, Leaf, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Meals Shared", value: "12,500+" },
  { label: "Active Donors", value: "1,200+" },
  { label: "Communities Served", value: "75+" }
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 p-4 pb-16">
      <section className="grid items-center gap-8 py-8 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold text-primary md:text-5xl">Share Food. Spread Kindness.</h1>
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
            Connect surplus food with people who need it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/auth" className="btn-primary">Donate Food</Link>
            <Link to="/map" className="btn-secondary">Find Food</Link>
          </div>
        </div>
        <img
          className="w-full rounded-3xl shadow-md"
          src="https://images.unsplash.com/photo-1488459716781-31db52582fe9"
          alt="Community sharing food"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card"><HandHeart className="text-primary" /><h3 className="mt-2 font-semibold">How It Works</h3><p className="text-sm">Donors list food, receivers discover nearby options, and pickup is coordinated quickly.</p></div>
        <div className="card"><Leaf className="text-primary" /><h3 className="mt-2 font-semibold">Why FoodBridge</h3><p className="text-sm">Reduce food waste, support sustainability, and strengthen neighborhood support.</p></div>
        <div className="card"><UsersRound className="text-primary" /><h3 className="mt-2 font-semibold">Human-Centered</h3><p className="text-sm">Warm, friendly design that helps NGOs, students, workers, and families.</p></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-3xl font-bold text-primary">{s.value}</p>
            <p className="text-sm">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h3 className="text-xl font-semibold">Testimonials</h3>
        <p className="mt-2 text-sm">"FoodBridge helped our shelter receive fresh meals daily." - Local NGO</p>
        <p className="mt-1 text-sm">"Simple, fast, and meaningful. I donate leftovers every week." - Home Donor</p>
      </section>

      <footer className="border-t border-green-100 pt-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <p>FoodBridge - Kindness, Sustainability, Community.</p>
        <Link to="/map" className="mt-2 inline-flex items-center gap-1 text-primary">
          Explore nearby donations <ArrowRight size={16} />
        </Link>
      </footer>
    </div>
  );
}

