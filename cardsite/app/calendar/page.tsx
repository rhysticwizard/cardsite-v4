import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pb-8 pt-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Event Calendar</h1>
        <p className="text-gray-400">View upcoming MTG events, tournaments, and releases</p>
      </div>
      
      <CalendarView />
    </div>
  );
} 