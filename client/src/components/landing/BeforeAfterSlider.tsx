import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BeforeAfterSliderProps = {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
};

export function BeforeAfterSlider({
  before,
  after,
  beforeLabel = "Avant",
  afterLabel = "Après — rendu IA",
  className = "",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const [hint, setHint] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setHint(false), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((p) => Math.max(8, p - 3));
      setHint(false);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((p) => Math.min(92, p + 3));
      setHint(false);
    }
  };

  return (
    <div className={`before-after-slider ${className}`} ref={containerRef}>
      <img src={after} alt={afterLabel} className="before-after-slider__img" loading="eager" />
      <img
        src={before}
        alt={beforeLabel}
        className="before-after-slider__img before-after-slider__before-clip"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        loading="eager"
      />

      <div
        className={`before-after-slider__handle ${hint ? "before-after-slider__handle--hint" : ""}`}
        style={{ left: `${position}%` }}
        aria-hidden="true"
      >
        <span>
          <GripVertical size={14} />
        </span>
      </div>

      <input
        type="range"
        min={8}
        max={92}
        value={position}
        onChange={(e) => {
          setPosition(Number(e.target.value));
          setHint(false);
        }}
        onKeyDown={onKeyDown}
        className="before-after-slider__range"
        aria-label="Comparer avant et après — flèches gauche/droite ou glisser"
        aria-valuetext={`${Math.round(position)}% avant visible`}
      />

      <span className="before-after-slider__label before-after-slider__label--before">{beforeLabel}</span>
      <span className="before-after-slider__label before-after-slider__label--after">{afterLabel}</span>

      {hint && (
        <div className="before-after-slider__hint" aria-hidden="true">
          Glissez pour comparer
        </div>
      )}
    </div>
  );
}
