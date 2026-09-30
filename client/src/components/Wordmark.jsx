import logo from "../assets/knak-logo-white.svg";

export default function Wordmark() {
  return (
    <div className="header__logo" style={{ display: "flex", alignItems: "center" }}>
      <img src={logo} alt="Knak" height={28} style={{ display: "block" }} />
    </div>
  );
}
