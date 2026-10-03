export default function Button({
  variant = "default",
  size = "default",
  className = "",
  type = "button",
  ...props
}) {
  const classes = ["btn"];
  if (variant === "primary") classes.push("btn-primary");
  if (variant === "ghost") classes.push("btn-ghost");
  if (variant === "vote") classes.push("btn-vote");
  if (size === "sm") classes.push("btn-sm");
  if (className) classes.push(className);

  return <button type={type} className={classes.join(" ")} {...props} />;
}