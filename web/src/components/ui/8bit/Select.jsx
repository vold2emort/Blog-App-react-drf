import { forwardRef } from "react";

import Field from "./Field";

const Select = forwardRef(function Select(
  { label, error, hint, className, children, ...props },
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
        <select
          {...props}
          {...field}
          ref={ref}
          className={`field${error ? " field-invalid" : ""}`}
        >
          {children}
        </select>
      )}
    </Field>
  );
});

export default Select;