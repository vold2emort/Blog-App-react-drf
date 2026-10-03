import { forwardRef } from "react";

import Field from "./Field";

const Input = forwardRef(function Input(
  { label, error, hint, className, ...props },
  ref,
) {
  return (
    <Field
      id={props.id ?? props.name}
      label={label}
      error={error}
      hint={hint}
      className={className}
    >
      {(field) => (
        <input
          {...props}
          {...field}
          ref={ref}
          className={`field${error ? " field-invalid" : ""}`}
        />
      )}
    </Field>
  );
});

export default Input;