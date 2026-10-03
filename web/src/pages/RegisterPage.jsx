import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import Button from "@/components/ui/8bit/Button";
import Input from "@/components/ui/8bit/Input";
import { applyApiErrors } from "@/lib/formErrors";
import { useAuth } from "@/auth/auth-context";

const KNOWN_FIELDS = ["email", "user_name", "password", "password_confirm"];

export default function RegisterPage() {
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: "", user_name: "", password: "", password_confirm: "" } });

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to={returnTo} replace />;

  async function onSubmit(values) {
    try {
      await signUp(values);
      navigate(returnTo, { replace: true });
    } catch (error) {
      applyApiErrors(error, setError, KNOWN_FIELDS);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="panel p-6">
        <h1 className="pixel-title text-base">Register</h1>
        <p className="mt-4 text-sm text-ink-muted">
          You will be signed in automatically.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-5">
          <Input
            name="user_name"
            label="Username"
            autoComplete="username"
            hint="Shown next to your posts and comments."
            {...register("user_name", { required: "Username is required." })}
            error={errors.user_name?.message}
          />

          <Input
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email", { required: "Email is required." })}
            error={errors.email?.message}
          />

          <Input
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            hint="At least 8 characters."
            {...register("password", {
              required: "Password is required.",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters.",
              },
            })}
            error={errors.password?.message}
          />

          <Input
            name="password_confirm"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            {...register("password_confirm", {
              validate: (value, form) =>
                value === form.password || "Passwords do not match.",
            })}
            error={errors.password_confirm?.message}
          />

          {errors.root?.message && (
            <p className="panel p-3 text-sm" role="alert">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating account" : "Register"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already registered?{" "}
        <Link
          to={`/login${searchParams.get("returnTo") ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="link"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}