import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotSchema, type ForgotInput } from "@/lib/validation";
import { requestPasswordReset } from "@/api/auth";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState<{ detail: string; demo_reset_token?: string; demo_email?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (values: ForgotInput) => {
    setError(null);
    try {
      setSent(await requestPasswordReset(values.email));
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <AuthLayout footnote={<Link to="/login" className="text-ink underline underline-offset-4">Back to sign in</Link>}>
      <h1 className="text-center font-display text-2xl">Reset password</h1>

      {sent ? (
        <div className="mt-8 space-y-5">
          <Notice tone="success">{sent.detail}</Notice>
          {sent.demo_reset_token && (
            <Notice tone="info">
              <p className="text-xs text-ink/70">Demo mode — no email service configured. Use the link below instead:</p>
              <Link
                to={`/reset-password?token=${sent.demo_reset_token}`}
                className="mt-2 inline-block text-sm text-ink underline underline-offset-4"
              >
                Open reset link →
              </Link>
            </Notice>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
          <p className="text-sm text-stone-500">Enter your account email and we'll send a reset link.</p>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}