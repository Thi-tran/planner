import { Suspense } from 'react';
import CalendarLayout from '../../components/calendar/CalendarLayout';

function CalendarLoading() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'DM Sans, sans-serif',
      color: '#6b7280'
    }}>
      Loading calendar...
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarLoading />}>
      <CalendarLayout />
    </Suspense>
  );
}
