type LandingSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function LandingSectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}: LandingSectionHeaderProps) {
  return (
    <div
      className={`landing-section-header ${align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl"} ${className}`}
    >
      {eyebrow ? <p className="landing-section-eyebrow">{eyebrow}</p> : null}
      <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-4 leading-tight">{title}</h2>
      {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  );
}
