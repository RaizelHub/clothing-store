import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { verifyEmail } from "@/api/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/misc";

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = (location.state as { token?: string } | null)?.token;
  const [status, setStatus] = useState<"verifying" | "verified" | "error">(token ? "verifying" : "error");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No verification token found. If you clicked a link from a simulated email it should contain one.");
      return;
    }
    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("verified");
      })
      .catch((e) => {
        if (!cancelled) {
          setStatus("error");
          setError(getApiErrorMessage(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthLayout>
      <h1 className="text-center font-display text-2xl">Email verification</h1>
      <div className="mt-8 space-y-5">
        {status === "verifying" && <p className="text-center text-sm text-stone-500">Verifying your email…</p>}
        {status === "verified" && (
          <>
            <Notice tone="success">Email verified — welcome in.</Notice>
            <Button fullWidth size="lg" onClick={() => navigate("/account")}>
              Continue to account
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <Notice tone="error">{error}</Notice>
            <Button fullWidth size="lg" variant="outline" onClick={() => navigate("/")}>
              Back to storefront
            </Button>
          </>
        )}
        <p className="text-center text-xs text-stone-400">
          Didn't get a link?{" "}
          <Link to="/account" className="underline underline-offset-2">
            Resend from your account page
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}