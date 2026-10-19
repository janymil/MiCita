import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/auth-api";
import { AuthShell, FormError } from "./auth-shell";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramEmail = params.get("email");
    if (paramEmail) setEmail(paramEmail);
  }, []);

  const sendCode = async () => {
    if (!email) {
      setError("Ingresa tu correo");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await authApi.requestEmailOtp(email.trim(), "verify_email");
      setInfo("Te enviamos un nuevo código");
      if (res.devCode) setDevCode(res.devCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código");
    } finally {
      setSending(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyEmailOtp(email.trim(), code.trim(), "verify_email");
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Verifica tu correo"
      subtitle="Confirma tu dirección para activar tu cuenta"
      footer={
        <Link href="/dashboard" className="font-medium text-red-600 hover:underline">
          Continuar al panel
        </Link>
      }
    >
      <div className="mb-4 flex justify-center">
        <div className="rounded-full bg-red-50 p-3">
          <MailCheck className="h-7 w-7 text-red-600" />
        </div>
      </div>

      <FormError message={error} />
      {info && !error && <p className="mb-4 text-sm text-gray-600">{info}</p>}
      {devCode && !error && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          Modo desarrollo — código: <span className="font-mono font-semibold">{devCode}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={verify} noValidate>
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
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Código de verificación
          </label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-1 tracking-[0.4em] text-center text-lg"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || code.length < 4 || !email}>
          {loading && <Loader2 className="animate-spin" />}
          Verificar correo
        </Button>
      </form>

      <button
        type="button"
        onClick={sendCode}
        disabled={sending || !email}
        className="mt-4 w-full text-sm text-red-600 hover:underline disabled:text-gray-400"
      >
        {sending ? "Enviando…" : "Reenviar código"}
      </button>
    </AuthShell>
  );
}
