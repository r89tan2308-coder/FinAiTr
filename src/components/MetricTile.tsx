interface MetricTileProps {
  title: string;
  value: string;
  detail: string;
  accent?: "teal" | "amber" | "red" | "blue";
}

export function MetricTile({
  title,
  value,
  detail,
  accent = "teal",
}: MetricTileProps) {
  return (
    <article className="metric-tile" data-accent={accent}>
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

