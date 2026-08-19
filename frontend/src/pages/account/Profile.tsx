import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { changePassword, updateProfile } from "@/api/auth";
import { profileSchema, changePasswordSchema, type ProfileInput, type ChangePasswordInput } from "@/lib/validation";
import { useSession } from "@/hooks/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/misc";
import { getApiErrorMessage } from "@/lib/errors";

export function ProfilePage() {
  const { data: me } = useSession();
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const profile = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: { first_name: me?.first_name ?? "", last_name: me?.last_name ?? "", email: me?.email ?? "" },
  });
  const password = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const saveProfile = useMutation({
    mutationFn: (v: ProfileInput) => updateProfile(v),
    onSuccess: () => {
      setProfileMsg({ ok: true, text: "Profile saved." });
    },
    onError: (e) => setProfileMsg({ ok: false, text: getApiErrorMessage(e) }),
  });

  const savePassword = useMutation({
    mutationFn: (v: ChangePasswordInput) => changePassword(v.current_password, v.new_password),
    onSuccess: () => {
      password.reset();
      setPasswordMsg({ ok: true, text: "Password updated." });
    },
    onError: (e) => setPasswordMsg({ ok: false, text: getApiErrorMessage(e) }),
  });

  return (
    <div className="max-w-xl space-y-10">
      <div>
        <h2 className="font-display text-2xl">Profile</h2>
        <form
          onSubmit={profile.handleSubmit((v) => saveProfile.mutate(v))}
          className="mt-6 space-y-5"
          noValidate
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" error={profile.formState.errors.first_name?.message}>
              <Input invalid={!!profile.formState.errors.first_name} {...profile.register("first_name")} />
            </Field>
            <Field label="Last name" error={profile.formState.errors.last_name?.message}>
              <Input invalid={!!profile.formState.errors.last_name} {...profile.register("last_name")} />
            </Field>
          </div>
          <Field label="Email" error={profile.formState.errors.email?.message} hint="Changing your email requires re-verification.">
            <Input type="email" invalid={!!profile.formState.errors.email} {...profile.register("email")} />
          </Field>
          {profileMsg && <Notice tone={profileMsg.ok ? "success" : "error"}>{profileMsg.text}</Notice>}
          <Button type="submit" loading={saveProfile.isPending || profile.formState.isSubmitting}>
            Save changes
          </Button>
        </form>
      </div>

      <div>
        <h2 className="font-display text-2xl">Change password</h2>
        <form
          onSubmit={password.handleSubmit((v) => savePassword.mutate(v))}
          className="mt-6 space-y-5"
          noValidate
        >
          <Field label="Current password" error={password.formState.errors.current_password?.message}>
            <Input type="password" autoComplete="current-password" invalid={!!password.formState.errors.current_password} {...password.register("current_password")} />
          </Field>
          <Field label="New password" error={password.formState.errors.new_password?.message} hint="At least 8 characters.">
            <Input type="password" autoComplete="new-password" invalid={!!password.formState.errors.new_password} {...password.register("new_password")} />
          </Field>
          <Field label="Confirm new password" error={password.formState.errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" invalid={!!password.formState.errors.confirm} {...password.register("confirm")} />
          </Field>
          {passwordMsg && <Notice tone={passwordMsg.ok ? "success" : "error"}>{passwordMsg.text}</Notice>}
          <Button type="submit" loading={savePassword.isPending || password.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}