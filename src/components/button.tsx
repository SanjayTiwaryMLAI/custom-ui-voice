export const Button = ({
  label = "Button",
  type = undefined,
  className = "",
  disabled = false,
  onClick = () => {},
  id = "",
}) => {
  return (
    <button
      id={id}
      type={type}
      className={` text-sm  text-center ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
