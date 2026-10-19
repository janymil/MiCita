import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { AuthDivider, AuthShell, FormError, GoogleButton } from "./auth-shell";

function readNextParam(): string {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const googleError = params.get("error");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      setLocation(readNextParam());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Inicia sesión"
      subtitle="Gestiona tu negocio y tus citas en MiCita"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-red-600 hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormError
          message={
            error ||
            (googleError === "google_denied"
              ? "Cancelaste el inicio de sesión con Google"
              : googleError
                ? "No se pudo iniciar sesión con Google"
                : null)
          }
        />

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="mt-1"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <Link href="/forgot-password" className="text-xs text-red-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || !email || !password}>
          {loading && <Loader2 className="animate-spin" />}
          Iniciar sesión
        </Button>
      </form>

      <AuthDivider />

      <div className="space-y-3">
        <GoogleButton />
        <Link
          href="/otp"
          className="w-full flex items-center justify-center h-10 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Acceder con código (correo o teléfono)
        </Link>
      </div>
    </AuthShell>
  );
}
