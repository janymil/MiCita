import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/auth-api";
import { AuthShell, FormError } from "./auth-shell";

const rules = [
  { label: "Al menos 10 caracteres", test: (v: string) => v.length >= 10 },
  { label: "Una letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { label: "Una letra mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Un número", test: (v: string) => /[0-9]/.test(v) },
];

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  const passwordOk = useMemo(() => rules.every((r) => r.test(password)), [password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => setLocation("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Enlace inválido" subtitle="Este enlace de restablecimiento no es válido o expiró">
        <Link href="/forgot-password" className="text-red-600 hover:underline text-sm">
          Solicitar un nuevo enlace
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Contraseña actualizada" subtitle="Serás redirigido al inicio de sesión…">
        <p className="text-sm text-gray-600">Tu contraseña se cambió correctamente.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle="Elige una contraseña segura">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormError message={error} />
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Nueva contraseña
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
          />
          <ul className="mt-2 space-y-1">
            {rules.map((rule) => {
              const passed = rule.test(password);
              return (
                <li key={rule.label} className="flex items-center gap-2 text-xs">
                  {passed ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-gray-300" />}
                  <span className={passed ? "text-green-700" : "text-gray-500"}>{rule.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
            Confirmar contraseña
          </label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !passwordOk || password !== confirm}>
          {loading && <Loader2 className="animate-spin" />}
          Restablecer contraseña
        </Button>
      </form>
    </AuthShell>
  );
}
