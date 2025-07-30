import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to Stack's sign-in handler
    setLocation("/handler/sign-in");
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
