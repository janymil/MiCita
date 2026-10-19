import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Mail, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { authApi } from "@/lib/auth-api";
import { AuthShell, FormError } from "./auth-shell";

type Channel = "email" | "phone";

export default function OtpLogin() {
  const { refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [channel, setChannel] = useState<Channel>("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setDevCode(null);
    try {
      if (channel === "email") {
        const res = await authApi.requestEmailOtp(identifier.trim());
        setInfo(`Enviamos un código a ${identifier.trim()}`);
        if (res.devCode) setDevCode(res.devCode);
      } else {
        const res = await authApi.requestPhoneOtp(identifier.trim());
        setInfo(`Enviamos un código por SMS a ${res.phone}`);
        if (res.devCode) setDevCode(res.devCode);
      }
      setStage("verify");
      setCooldown(45);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (channel === "email") {
        await authApi.verifyEmailOtp(identifier.trim(), code.trim());
      } else {
        await authApi.verifyPhoneOtp(identifier.trim(), code.trim());
      }
      await refresh();
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Acceso con código"
      subtitle="Te enviaremos un código de un solo uso"
      footer={
        <Link href="/login" className="font-medium text-red-600 hover:underline">
          Volver al inicio de sesión
        </Link>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
        {(["email", "phone"] as Channel[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setChannel(c);
              setStage("request");
              setCode("");
              setError(null);
              setInfo(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
              channel === c ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {c === "email" ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            {c === "email" ? "Correo" : "Teléfono"}
          </button>
        ))}
      </div>

      <FormError message={error} />
      {devCode && !error && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          Modo desarrollo — código: <span className="font-mono font-semibold">{devCode}</span>
        </div>
      )}

      {stage === "request" ? (
        <form className="space-y-4" onSubmit={requestCode} noValidate>
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
              {channel === "email" ? "Correo electrónico" : "Número de teléfono"}
            </label>
            <Input
              id="identifier"
              type={channel === "email" ? "email" : "tel"}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={channel === "email" ? "tu@correo.com" : "+51 987 654 321"}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !identifier}>
            {loading && <Loader2 className="animate-spin" />}
            Enviar código
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={verifyCode} noValidate>
          {info && <p className="text-sm text-gray-600">{info}</p>}
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
              placeholder="123456"
              className="mt-1 tracking-[0.4em] text-center text-lg"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || code.length < 4}>
            {loading && <Loader2 className="animate-spin" />}
            Verificar e ingresar
          </Button>
          <div className="flex justify-between text-xs">
            <button type="button" className="text-gray-500 hover:text-gray-700" onClick={() => setStage("request")}>
              Cambiar {channel === "email" ? "correo" : "número"}
            </button>
            <button
              type="button"
              disabled={cooldown > 0}
              className="text-red-600 disabled:text-gray-400"
              onClick={() => setStage("request")}
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
