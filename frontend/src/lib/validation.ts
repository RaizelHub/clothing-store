import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z.string().min(8, "At least 8 characters.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required."),
    last_name: z.string().trim().min(1, "Last name is required."),
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email });
export type ForgotInput = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });
export type ResetInput = z.infer<typeof resetSchema>;

export const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  email,
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required."),
    new_password: password,
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  recipient: z.string().trim().min(1, "Recipient is required."),
  line1: z.string().trim().min(1, "Address is required."),
  line2: z.string().trim().default(""),
  city: z.string().trim().min(1, "City is required."),
  state: z.string().trim().default(""),
  postal_code: z.string().trim().min(1, "Postal code is required."),
  country: z.string().trim().min(1, "Country is required."),
  phone: z.string().trim().min(6, "Phone number is required."),
  is_default: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const shippingSchema = z.object({
  recipient: z.string().trim().min(1, "Recipient is required."),
  line1: z.string().trim().min(1, "Address is required."),
  line2: z.string().trim().default(""),
  city: z.string().trim().min(1, "City is required."),
  state: z.string().trim().default(""),
  postal_code: z.string().trim().min(1, "Postal code is required."),
  country: z.string().trim().default("US"),
  phone: z.string().trim().min(6, "Phone number is required."),
});
export type ShippingInput = z.infer<typeof shippingSchema>;

export const cardSchema = z.object({
  name: z.string().trim().min(1, "Name on card is required."),
  number: z
    .string()
    .trim()
    .regex(/^[\d\s]{15,19}$/, "Enter a valid card number.")
    .transform((v) => v.replace(/\s/g, "")),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/?(\d{2})$/, "MM/YY"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "CVC"),
});
export type CardInput = z.infer<typeof cardSchema>;

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Select a rating.").max(5),
  comment: z.string().trim().min(3, "A short comment helps other shoppers.").max(600),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, "Enter a code."),
});
export type CouponInput = z.infer<typeof couponSchema>;

export const newsletterSchema = z.object({ email });
export type NewsletterInput = z.infer<typeof newsletterSchema>;