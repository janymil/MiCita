import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MicitaLogo, AndeanSun } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categories, CITY_DISTRICTS } from "@/lib/constants";
import {
  Search, MapPin, Phone, Star, Globe, CalendarCheck,
  ArrowRight, ChevronLeft, ChevronRight, Store, Compass,
} from "lucide-react";

interface ExploreResult {
  id: string;
  name: string;
  address?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  website?: string;
  photoUrl?: string;
  openNow?: boolean;
  isRegistered?: boolean;
  customUrl?: string | null;
  district?: string | null;
}

interface ExploreResponse {
  results: ExploreResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    actualResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const LIMA_DISTRICTS = CITY_DISTRICTS["Lima"] || [];

export default function ExplorePage() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [district, setDistrict] = useState("all");
  const [page, setPage] = useState(1);

  const searchUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    if (district !== "all") params.set("district", district);
    params.set("sort", "rating");
    params.set("page", String(page));
    params.set("limit", "12");
    return `/api/search?${params.toString()}`;
  }, [query, category, district, page]);

  const { data, isLoading, isFetching } = useQuery<ExploreResponse>({
    queryKey: [searchUrl],
  });

  const submitSearch = (e?: FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setQuery(queryInput);
  };

  const pickCategory = (id: string) => {
    setCategory(id);
    setPage(1);
  };

  const results = data?.results ?? [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-brand-hero">
      {/* Header */}
      <header className="border-b border-[hsl(36_55%_90%)] bg-[hsl(40_74%_96%/0.9)] backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <MicitaLogo size="sm" showTagline />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-[hsl(var(--brand-tinta-soft))] hover:text-[hsl(var(--brand-manta))] transition-colors">
              Para negocios
            </Link>
            <Link href="/buscar" className="text-[hsl(var(--brand-manta))] inline-flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> Explorar
            </Link>
          </nav>
          <Link href="/login">
            <Button variant="ghost" size="sm">Iniciar sesión</Button>
          </Link>
        </div>
      </header>

      {/* Hero + búsqueda */}
      <section className="bg-chakana pt-14 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-hand text-2xl text-[hsl(var(--brand-gold))]">encuentra tu momento</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[hsl(var(--brand-tinta))] leading-tight">
            Reserva tu cita con los <span className="text-brand-gradient">mejores de tu zona</span>
          </h1>
          <AndeanSun className="mx-auto mt-3 mb-6" />

          <form onSubmit={submitSearch} className="brand-card flex flex-col sm:flex-row items-stretch gap-2 p-2 mx-auto max-w-2xl">
            <div className="flex items-center flex-1 px-3">
              <Search className="w-5 h-5 text-[hsl(var(--brand-manta))] mr-2 shrink-0" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Barbería, uñas, masaje, veterinaria…"
                className="w-full py-3 bg-transparent outline-none text-[hsl(var(--brand-tinta))] placeholder:text-[hsl(var(--brand-tinta-soft))]"
              />
            </div>
            <div className="flex items-center sm:w-56 px-3 border-t sm:border-t-0 sm:border-l border-[hsl(36_55%_90%)]">
              <MapPin className="w-5 h-5 text-[hsl(var(--brand-manta))] mr-2 shrink-0" />
              <select
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
                className="w-full py-3 bg-transparent outline-none text-[hsl(var(--brand-tinta))]"
              >
                <option value="all">Todo Lima</option>
                {LIMA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="brand-btn-primary border-0 h-12 px-8">
              Buscar
            </Button>
          </form>

          {/* Chips de categoría */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <button
              onClick={() => pickCategory("all")}
              data-active={category === "all"}
              className="brand-chip px-4 py-1.5 text-sm font-medium"
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                data-active={category === c.id}
                className="brand-chip px-4 py-1.5 text-sm font-medium"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>
      {/* Resultados */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-[hsl(var(--brand-tinta))]">
            {query ? `Resultados para “${query}”` : "Negocios cerca de ti"}
          </h2>
          {pagination && (
            <p className="text-sm text-[hsl(var(--brand-tinta-soft))]">
              {pagination.totalResults} encontrados
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="brand-card p-4 animate-pulse">
                <div className="h-36 rounded-xl bg-[hsl(36_55%_92%)] mb-4" />
                <div className="h-4 rounded bg-[hsl(36_55%_92%)] w-2/3 mb-2" />
                <div className="h-3 rounded bg-[hsl(36_55%_92%)] w-1/2" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="brand-card text-center py-16">
            <Store className="w-12 h-12 mx-auto text-[hsl(var(--brand-gold))] mb-4" />
            <h3 className="font-display text-xl font-bold text-[hsl(var(--brand-tinta))] mb-2">
              No encontramos resultados
            </h3>
            <p className="text-[hsl(var(--brand-tinta-soft))]">
              Prueba con otra búsqueda o explora una categoría diferente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((business) => {
              const categoryInfo = categories.find((c) => c.id === business.category);
              return (
                <article key={business.id} className="brand-card overflow-hidden flex flex-col">
                  {business.photoUrl ? (
                    <img
                      src={business.photoUrl}
                      alt={business.name}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-36 bg-brand-gradient bg-chakana-light flex items-center justify-center">
                      <span className="font-display text-4xl font-bold text-white/90">
                        {business.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-display text-lg font-bold text-[hsl(var(--brand-tinta))] leading-snug">
                        {business.name}
                      </h3>
                      {typeof business.rating === "number" && business.rating > 0 && (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#B8720B] shrink-0">
                          <Star className="w-4 h-4 fill-[hsl(var(--brand-gold))] text-[hsl(var(--brand-gold))]" />
                          {business.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {categoryInfo && (
                        <Badge variant="secondary" className="bg-[hsl(38_85%_93%)] text-[#8A5A08] border-[hsl(35_80%_82%)]">
                          {categoryInfo.name}
                        </Badge>
                      )}
                      {business.openNow && (
                        <Badge variant="secondary" className="bg-[hsl(175_45%_93%)] text-[hsl(var(--brand-teal))] border-[hsl(174_53%_80%)]">
                          Abierto ahora
                        </Badge>
                      )}
                      {business.isRegistered && (
                        <Badge variant="secondary" className="bg-[hsl(5_80%_94%)] text-[hsl(var(--brand-manta))] border-[hsl(5_62%_85%)]">
                          <CalendarCheck className="w-3 h-3 mr-1" /> Reserva online
                        </Badge>
                      )}
                    </div>

                    {business.address && (
                      <p className="text-sm text-[hsl(var(--brand-tinta-soft))] flex items-center gap-1.5 mb-4">
                        <MapPin className="w-4 h-4 shrink-0 text-[hsl(var(--brand-manta))]" />
                        <span className="line-clamp-1">{business.address}</span>
                      </p>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-2">
                      {business.customUrl ? (
                        <Link href={`/${business.customUrl}`} className="flex-1">
                          <Button size="sm" className="brand-btn-primary border-0 w-full">
                            Ver micrositio <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      ) : business.website ? (
                        <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full border-[hsl(36_55%_85%)]">
                            <Globe className="w-4 h-4 mr-1.5 text-[hsl(var(--brand-teal))]" /> Sitio web
                          </Button>
                        </a>
                      ) : null}
                      {business.phone && (
                        <a href={`tel:${business.phone}`}>
                          <Button size="sm" variant="outline" className="border-[hsl(36_55%_85%)] px-3">
                            <Phone className="w-4 h-4 text-[hsl(var(--brand-manta))]" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <Button
              variant="outline"
              disabled={!pagination.hasPrevPage || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-[hsl(36_55%_85%)]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">
              Página {pagination.currentPage} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={!pagination.hasNextPage || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="border-[hsl(36_55%_85%)]"
            >
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </section>

      {/* CTA para negocios */}
      <section className="relative py-16 px-4 bg-brand-gradient overflow-hidden">
        <div className="absolute inset-0 bg-chakana-light" />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <p className="font-hand text-2xl mb-2">¿tienes un negocio?</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Crea tu micrositio y recibe reservas en minutos
          </h2>
          <p className="text-white/85 mb-6">
            Registra tu negocio en MiCita y obtén tu página web automática con agenda online.
          </p>
          <Link href="/registro">
            <Button size="lg" className="bg-white text-[hsl(var(--brand-manta))] hover:bg-[hsl(40_74%_96%)] font-semibold shadow-lg">
              Registrar mi negocio gratis <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4" style={{ backgroundColor: "hsl(var(--brand-tinta))" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display font-bold text-white">
            Mi<span className="text-brand-gradient">Cita</span>
          </span>
          <p className="text-sm text-[hsl(40_20%_70%)] text-center">
            Hecha en Perú, para negocios y clientes del Perú. © 2025 MiCita.
          </p>
        </div>
      </footer>
    </div>
  );
}

