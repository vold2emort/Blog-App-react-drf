import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import Button from "@/components/ui/8bit/Button";
import Input from "@/components/ui/8bit/Input";
import { Navigate } from "react-router-dom";
import { applyApiErrors } from "@/lib/formErrors";
import { useAuth } from "@/auth/auth-context";

export default function LoginPage() {
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: "", password: "" } });

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to={returnTo} replace />;

  async function onSubmit(values) {
    try {
      await signIn(values);
      navigate(returnTo, { replace: true });
    } catch (error) {
      applyApiErrors(error, setError, ["email", "password"]);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="panel p-6">
        <h1 className="pixel-title text-base">Log in</h1>

        {searchParams.get("returnTo") && (
          <p className="mt-4 panel-inset p-3 text-sm text-ink-muted">
            Log in to continue.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-5">
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
            autoComplete="current-password"
            {...register("password", { required: "Password is required." })}
            error={errors.password?.message}
          />

          {errors.root?.message && (
            <p className="panel p-3 text-sm" role="alert">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Logging in" : "Log in"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        No account?{" "}
        <Link
          to={`/register${searchParams.get("returnTo") ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="link"
        >
          Register
        </Link>
      </p>
    </div>
  );
}