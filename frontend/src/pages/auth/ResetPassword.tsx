import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetSchema, type ResetInput } from "@/lib/validation";
import { confirmPasswordReset } from "@/api/auth";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  const onSubmit = async (values: ResetInput) => {
    setError(null);
    try {
      await confirmPasswordReset(token, values.password);
      setDone(true);
      setTimeout(() => navigate("/login?reset=1", { replace: true }), 1500);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  if (done) {
    return (
      <AuthLayout>
        <Notice tone="success">Password updated. Taking you to sign in…</Notice>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout footnote={<Link to="/login" className="text-ink underline underline-offset-4">Back to sign in</Link>}>
      <h1 className="text-center font-display text-2xl">Choose a new password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
        <Field label="New password" error={errors.password?.message} hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" invalid={!!errors.confirm} {...register("confirm")} />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}