
import "./index.css";

export default function App() {

  return (
    <div style={{ padding: 12 }}>
      {/* First row */}
      <div style={{ display: "flex", "alignItems": "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button className="app-button">Load File</button>
        <span style={{ alignSelf: "center" }}>OR</span>
        <button className="app-button">Load Library</button>
        <span style={{ alignSelf: "center" }}>OR</span>

        <form style={{ display: "flex", gap: 8 }}>
          <input
            className="Input"
            placeholder="Enter link..."
            value=""
          />
          <button
            type="submit"
            className="app-button"
            disabled
          >
            Animate!
          </button>
        </form>
      </div>

      {/* second row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="app-button">Play (P)</button>
        <button className="app-button">Step (S)</button>
        <button className="app-button">Reset (R)</button>
        <button className="app-button">Hide Toolbar (Q)</button>
        <button className="app-button">Export to SVG</button>
        <button className="app-button">Prepare WebM</button>
      </div>
    </div>
  );
}
