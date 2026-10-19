import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { AuthDivider, AuthShell, FormError, GoogleButton } from "./auth-shell";

const rules = [
  { label: "Al menos 10 caracteres", test: (v: string) => v.length >= 10 },
  { label: "Una letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { label: "Una letra mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Un número", test: (v: string) => /[0-9]/.test(v) },
];

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordOk = useMemo(() => rules.every((r) => r.test(form.password)), [form.password]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordOk) {
      setError("La contraseña no cumple los requisitos");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      setLocation(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Publica tu negocio y recibe reservas en línea"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-red-600 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormError message={error} />

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre completo
          </label>
          <Input id="name" required autoComplete="name" value={form.name} onChange={update("name")} className="mt-1" />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Teléfono <span className="text-gray-400">(opcional)</span>
          </label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+51 987 654 321"
            value={form.phone}
            onChange={update("phone")}
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            className="mt-1"
          />
          <ul className="mt-2 space-y-1">
            {rules.map((rule) => {
              const passed = rule.test(form.password);
              return (
                <li key={rule.label} className="flex items-center gap-2 text-xs">
                  {passed ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-gray-300" />
                  )}
                  <span className={passed ? "text-green-700" : "text-gray-500"}>{rule.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !form.name || !form.email || !passwordOk}>
          {loading && <Loader2 className="animate-spin" />}
          Crear cuenta
        </Button>
      </form>

      <AuthDivider />

      <GoogleButton label="Registrarse con Google" />
    </AuthShell>
  );
}
