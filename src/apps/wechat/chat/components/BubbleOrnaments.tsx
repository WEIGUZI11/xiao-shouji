/** Decorative hooks for selectable chat skins. CSS turns these neutral nodes into each skin's real structure. */
export function BubbleOrnaments() {
  return (
    <span className="bubble-ornaments" aria-hidden="true">
      <i className="bubble-ornament bubble-ornament-a" />
      <i className="bubble-ornament bubble-ornament-b" />
      <i className="bubble-ornament bubble-ornament-c" />
      <i className="bubble-ornament bubble-ornament-d" />
    </span>
  );
}
