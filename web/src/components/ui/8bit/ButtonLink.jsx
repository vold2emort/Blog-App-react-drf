import { Link } from "react-router-dom";

export default function ButtonLink({
  variant = "default",
  size = "default",
  className = "",
  ...props
}) {
  const classes = ["btn"];
  if (variant === "primary") classes.push("btn-primary");
  if (variant === "ghost") classes.push("btn-ghost");
  if (size === "sm") classes.push("btn-sm");
  if (className) classes.push(className);

  return <Link className={classes.join(" ")} {...props} />;
}