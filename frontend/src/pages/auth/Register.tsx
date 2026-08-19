import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validation";
import { useRegister } from "@/hooks/auth";
import { useMergeCart } from "@/hooks/useCart";
import { verifyEmail } from "@/api/auth";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";

export function RegisterPage() {
  const register = useRegister();
  const mergeCart = useMergeCart();
  const navigate = useNavigate();
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterInput) => {
    setNotice(null);
    register.mutate(
      { email: values.email, password: values.password, first_name: values.first_name, last_name: values.last_name },
      {
        onSuccess: (result) => {
          setDemoToken(result.demo_verification_token ?? null);
          mergeCart.mutate(undefined, {
            onSettled: () => navigate("/verify-email", { state: { token: result.demo_verification_token } }),
          });
        },
        onError: (e) => setNotice(getApiErrorMessage(e)),
      }
    );
  };

  const handleDemoVerify = async () => {
    if (!demoToken) return;
    setVerifying(true);
    try {
      await verifyEmail(demoToken);
      navigate("/account", { state: { verified: true } });
    } catch (e) {
      setNotice(getApiErrorMessage(e));
      setVerifying(false);
    }
  };

  return (
    <AuthLayout
      footnote={
        <>
          Already an Atelier client?{" "}
          <Link to="/login" className="text-ink underline underline-offset-4 font-medium">
            Sign In
          </Link>
        </>
      }
    >
      <div className="text-center mb-6">
        <h1 className="font-display text-3xl text-ink">Create Account</h1>
        <p className="mt-1 text-xs text-stone-500">Join Studio Atelier for bespoke wardrobe access.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" error={errors.first_name?.message}>
            <Input autoComplete="given-name" invalid={!!errors.first_name} {...field("first_name")} />
          </Field>
          <Field label="Last name" error={errors.last_name?.message}>
            <Input autoComplete="family-name" invalid={!!errors.last_name} {...field("last_name")} />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" invalid={!!errors.email} {...field("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message} hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" invalid={!!errors.password} {...field("password")} />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" invalid={!!errors.confirm} {...field("confirm")} />
        </Field>
        {notice && <Notice tone="error">{notice}</Notice>}
        <Button type="submit" fullWidth size="lg" className="mt-2" loading={register.isPending}>
          Create Account
        </Button>
      </form>
      {demoToken && (
        <div className="mt-6">
          <Notice tone="info">
            <p className="text-xs">Demo mode: a verification token was generated.</p>
            <Button variant="ghost" size="sm" className="mt-2 px-0 text-xs uppercase tracking-widest text-ink font-medium" onClick={handleDemoVerify} loading={verifying} type="button">
              Simulate opening email link →
            </Button>
          </Notice>
        </div>
      )}
    </AuthLayout>
  );
}