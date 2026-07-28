import styled from 'styled-components';
import { ChecklistSummary } from '@/lib/types';

interface SummaryMetricsProps {
  summary: ChecklistSummary;
}

export default function SummaryMetrics({ summary }: SummaryMetricsProps) {
  return (
    <MetricsRow>
      <MetricCard>
        <MetricValue>{summary.totalChecklists}</MetricValue>
        <MetricLabel>Checklists</MetricLabel>
      </MetricCard>
      <MetricCard>
        <MetricValue>{summary.totalTasks}</MetricValue>
        <MetricLabel>Total tasks</MetricLabel>
      </MetricCard>
      <MetricCard>
        <MetricValue $color="#10B981">{summary.completedTasks}</MetricValue>
        <MetricLabel>Completed</MetricLabel>
      </MetricCard>
      <MetricCard>
        <MetricValue $color="#E91E8C">{summary.overdueTasks}</MetricValue>
        <MetricLabel>Overdue</MetricLabel>
      </MetricCard>
    </MetricsRow>
  );
}

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const MetricCard = styled.div`
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
`;

const MetricValue = styled.div<{ $color?: string }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: ${p => p.$color || '#1f2937'};
`;

const MetricLabel = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
`;
