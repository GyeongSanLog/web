import logoImage from "../assets/logo.png";

export default function Logo({ size = 56 }) {
  return (
    <img
      src={logoImage}
      alt="경산로그 로고"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}