import { useState } from "react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/auth-api";
import { AuthShell, FormError } from "./auth-shell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSent(true);
      if (res.devToken) setDevToken(res.devToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Revisa tu correo"
        subtitle="Si existe una cuenta con ese correo, enviamos un enlace de restablecimiento"
        footer={
          <Link href="/login" className="font-medium text-red-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        }
      >
        {devToken ? (
          <Link
            href={`/reset-password?token=${devToken}`}
            className="block rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 hover:underline"
          >
            Modo desarrollo — abrir enlace de restablecimiento
          </Link>
        ) : (
          <p className="text-sm text-gray-600">
            El enlace vence en 30 minutos. Revisa tu bandeja de entrada y la carpeta de spam.
          </p>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un enlace para restablecerla"
      footer={
        <Link href="/login" className="font-medium text-red-600 hover:underline">
          Volver al inicio de sesión
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormError message={error} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !email}>
          {loading && <Loader2 className="animate-spin" />}
          Enviar enlace
        </Button>
      </form>
    </AuthShell>
  );
}
