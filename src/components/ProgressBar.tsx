interface ProgressBarProps {
  color: string;
  label: string;
  value: string;
  percent: number;
}

export function ProgressBar({ color, label, percent, value }: ProgressBarProps) {
  return (
    <div className="bar-row">
      <div className="bar-row-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track" aria-label={`${label}: ${value}`}>
        <div
          className="bar-fill"
          style={{ backgroundColor: color, width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

