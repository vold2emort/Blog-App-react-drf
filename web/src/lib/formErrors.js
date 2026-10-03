import { errorMessage, fieldErrors } from "@/api/client";

/**
 * Map a DRF error body onto react-hook-form. Errors on fields this form does
 * not own collapse into the form-level `root` error instead of vanishing.
 */
export function applyApiErrors(error, setError, knownFields) {
  const entries = Object.entries(fieldErrors(error)).filter(([name]) =>
    knownFields.includes(name),
  );

  if (entries.length === 0) {
    setError("root", { message: errorMessage(error) });
    return;
  }

  entries.forEach(([name, message]) => setError(name, { message }));
}

export { errorMessage };