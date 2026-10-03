import { forwardRef } from "react";

import Field from "./Field";

const Textarea = forwardRef(function Textarea(
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
        <textarea
          {...props}
          {...field}
          ref={ref}
          className={`field${error ? " field-invalid" : ""}`}
        />
      )}
    </Field>
  );
});

export default Textarea;