import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { useLogin } from "@/hooks/auth";
import { useMergeCart } from "@/hooks/useCart";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";

export function LoginPage() {
  const login = useLogin();
  const mergeCart = useMergeCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/account";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const fillDemo = (email: string, pass: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
    setServerError(null);
  };

  // Merge any guest cart items into the freshly-signed-in account.
  useEffect(() => {
    if (login.isSuccess) {
      mergeCart.mutate(undefined, {
        onSettled: () => navigate(redirectTo, { replace: true }),
      });
    }
  }, [login.isSuccess, mergeCart, navigate, redirectTo]);

  const onSubmit = (values: LoginInput) => {
    setServerError(null);
    login.mutate(values, { onError: (e) => setServerError(getApiErrorMessage(e)) });
  };

  return (
    <AuthLayout
      footnote={
        <>
          New to Studio Atelier?{" "}
          <Link to="/register" className="text-ink underline underline-offset-4 font-medium">
            Create an Account
          </Link>
        </>
      }
    >
      <div className="text-center mb-6">
        <h1 className="font-display text-3xl text-ink">Sign In</h1>
        <p className="mt-1 text-xs text-stone-500">Access your saved pieces and order records.</p>
      </div>

      {/* Quick Demo Login selector */}
      <div className="mb-6 border border-stone-200/90 bg-stone-50/60 p-3.5">
        <p className="text-center text-[10px] font-medium uppercase tracking-widest text-stone-500 font-mono">
          Demo Accounts
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2 justify-center font-mono">
          <button
            type="button"
            onClick={() => fillDemo("elena@example.com", "password123")}
            className="border border-stone-300 bg-paper px-3 py-1.5 text-[11px] text-ink transition-colors hover:border-ink hover:bg-stone-100"
          >
            Elena (Customer)
          </button>
          <button
            type="button"
            onClick={() => fillDemo("admin@studio.test", "admin12345")}
            className="border border-stone-300 bg-paper px-3 py-1.5 text-[11px] text-ink transition-colors hover:border-ink hover:bg-stone-100"
          >
            Admin (Staff)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email Address" error={errors.email?.message}>
          <Input type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
        </Field>
        <div className="flex justify-end pt-1">
          <Link to="/forgot-password" className="text-[11px] uppercase tracking-widest text-stone-500 hover:text-ink">
            Forgot Password?
          </Link>
        </div>
        {serverError && <Notice tone="error">{serverError}</Notice>}
        <Button type="submit" fullWidth size="lg" className="mt-2" loading={login.isPending}>
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
}