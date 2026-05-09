interface CompletionPieChartProps {
  completedCount: number;
  totalCount: number;
}

export function CompletionPieChart({
  completedCount,
  totalCount,
}: CompletionPieChartProps) {
  const completionRate = totalCount > 0 ? completedCount / totalCount : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - completionRate);

  return (
    <svg
      className="h-[92px] w-[92px]"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`完成率 ${Math.round(completionRate * 100)}%`}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="12"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#26C6DA"
        strokeLinecap="round"
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}
