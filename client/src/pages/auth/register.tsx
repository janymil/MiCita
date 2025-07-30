import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Register() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to Stack's sign-up handler
    setLocation("/handler/sign-up");
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to registration...</p>
      </div>
    </div>
  );
}
