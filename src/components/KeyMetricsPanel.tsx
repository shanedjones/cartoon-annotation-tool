'use client';

interface KeyMetric {
  name: string;
  value: string | number;
}

interface KeyMetricsPanelProps {
  keyMetricsTitle?: string;
  keyMetrics: KeyMetric[];
}

export default function KeyMetricsPanel({ keyMetricsTitle, keyMetrics }: KeyMetricsPanelProps) {
  if (!keyMetrics || keyMetrics.length === 0) return null;

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 h-full">
      <h2 className="text-xl font-semibold mb-3 dark:text-white">{keyMetricsTitle || "Key Metrics"}</h2>
      <div className="flex flex-col gap-3">
        {keyMetrics.map((metric, index) => (
          <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded shadow-sm">
            <span className="block text-xs text-gray-500 dark:text-gray-300">{metric.name}</span>
            <span className="text-lg font-semibold dark:text-white">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}