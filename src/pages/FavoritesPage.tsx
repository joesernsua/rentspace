import { useEffect, useState } from "react";
import { FiHeart } from "react-icons/fi";
import { Link } from "react-router";
import {
  getFavouriteProperties,
  getPropertyCoverImage,
  toggleFavouriteProperty,
} from "../services/favouriteService";
import type { Property } from "../types/Property";

function formatPrice(price: number) {
  return `RM ${price.toLocaleString()}`;
}

export default function FavoritesPage() {
  const [favourites, setFavourites] = useState<Property[]>([]);

  useEffect(() => {
    setFavourites(getFavouriteProperties());
  }, []);

  const removeFavourite = (property: Property) => {
    toggleFavouriteProperty(property);
    setFavourites(getFavouriteProperties());
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-145px)] max-w-6xl px-4 pb-20 pt-8 text-slate-950 dark:text-white sm:px-6">
      <section className="mb-8">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-300">
          Favourites
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your favourite homes</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Homes you saved from property details will appear here.
        </p>
      </section>

      {favourites.length === 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/75 dark:shadow-black/20">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-400 text-2xl text-slate-950 shadow-lg shadow-emerald-500/20">
            <FiHeart aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-black">No favourites yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
            Click Favourite on a property to save it here.
          </p>
          <Link
            to="/properties.php"
            className="mt-8 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
          >
            Browse properties
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favourites.map((property) => (
            <article key={property.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/10">
              <Link to={`/properties/${property.id}`}>
                <div className="overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
                  {getPropertyCoverImage(property) ? (
                    <img src={getPropertyCoverImage(property)} alt={property.title} className="aspect-square w-full object-cover transition hover:scale-105" />
                  ) : (
                    <div className="grid aspect-square place-items-center text-sm font-bold text-slate-400">No image available</div>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black">{property.title}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{property.location}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFavourite(property)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-pink-200 bg-pink-100 text-pink-600 transition hover:bg-pink-200 dark:border-pink-300/40 dark:bg-pink-300/20 dark:text-pink-200"
                    aria-label={`Remove ${property.title} from favourites`}
                  >
                    <FiHeart className="fill-current" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  {property.rooms} room{property.rooms === 1 ? "" : "s"} · {property.bathrooms} bath{property.bathrooms === 1 ? "" : "s"} · {property.type}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-black text-slate-950 dark:text-white">{formatPrice(property.price)}</span> / month
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
