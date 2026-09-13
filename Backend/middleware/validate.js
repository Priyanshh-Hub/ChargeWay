/**
 * Centralized request validation using zod.
 * Usage: router.post("/x", validate(schema), handler)
 * Replaces ad-hoc `if (!field) return res.status(400)...` checks scattered
 * across routes with a single declarative schema + consistent error shape.
 */
const { z } = require("zod");

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      return res.status(400).json({
        error: first?.message || "Invalid request.",
        code: "VALIDATION_ERROR",
        field: first?.path?.join("."),
      });
    }
    req.body = result.data;
    next();
  };
}

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
  // Public registration must never allow self-assigning Admin — that's a
  // real privilege-escalation path if the role field is trusted as-is.
  // Admin accounts are created only via seeding/direct DB action, never
  // through this endpoint.
  role: z.enum(["User", "Station Manager"]).optional(),
  // Station Manager registration payload (see Frontend/src/components/
  // auth/Register.jsx handleFinalSubmit) — stationName was missing here
  // entirely, so zod's default "strip unknown keys" behavior silently
  // deleted it from every request. auth.js's station-creation branch
  // checks `if (role === "Station Manager" && stationName)`, so with
  // stationName always undefined post-validation, NO station was ever
  // created: a self-registered partner got a user account and nothing
  // else, no error, no station, no way to tell anything was wrong.
  stationName: z.string().trim().min(1).optional(),
  stationAddress: z.string().optional(),
  // What kind of venue is actually hosting the charger — answers "partner
  // of what" for admin review, which the flow previously never asked.
  businessName: z.string().trim().max(120).optional(),
  businessType: z.string().trim().max(60).optional(),
  stationLat: z.number().optional(),
  stationLng: z.number().optional(),
  stationPricePerKwh: z.number().optional(),
  stationFacilities: z.array(z.string()).optional(),
  stationChargers: z.array(z.any()).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  role: z.enum(["User", "Station Manager", "Admin"]).optional(),
  rememberMe: z.boolean().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required."),
  // Same rule as registerSchema — a first-time Google sign-in creates an
  // account with this role, so it's equally a privilege-escalation path
  // if left open to Admin.
  role: z.enum(["User", "Station Manager"]).optional(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
};
