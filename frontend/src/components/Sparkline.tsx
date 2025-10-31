interface SparklineProps {
  values?: (number | null | undefined)[];
  color?: string;
  emptyLabel?: string;
}

export function Sparkline({
  values = [],
  color = "#52ff99",
  emptyLabel = "No data",
}: SparklineProps) {
  const data = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  if (data.length === 0) {
    return <div className="empty">{emptyLabel}</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data
    .map((value, index) => {
      const x = data.length === 1 ? 100 : (index / (data.length - 1)) * 100;
      const norm = max === min ? 0.5 : (value - min) / (max - min);
      const y = 100 - norm * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 100 100" role="img" aria-label="sparkline chart">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={6}
        opacity={0.08}
        strokeLinecap="round"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
