"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  location?: string;
  type: "tournament" | "release" | "prerelease" | "draft" | "other";
  description?: string;
}

// Real MTG 2025 events from IGN articles
const getMTG2025Events = () => {
  return [
    // Main Set Releases
    {
      id: "innistrad-remastered",
      title: "Innistrad Remastered",
      date: new Date(2025, 0, 24), // January 24, 2025
      type: "release" as const,
      description: "Gothic Horror plane remaster with beloved card reprints including Edgar Markov, Liliana of the Veil, and Archangel Avacyn"
    },
    {
      id: "aetherdrift",
      title: "Aetherdrift",
      date: new Date(2025, 1, 14), // February 14, 2025
      type: "release" as const,
      description: "Multiversal racing set featuring the Ghirapur Grand Prix with racers from multiple planes"
    },
    {
      id: "tarkir-dragonstorm",
      title: "Tarkir Dragonstorm",
      date: new Date(2025, 3, 11), // April 11, 2025
      type: "release" as const,
      description: "Return to Tarkir with powerful dragons and the five clans: Abzan, Jeskai, Sultai, Mardu, and Temur"
    },
    {
      id: "final-fantasy",
      title: "Final Fantasy (Universes Beyond)",
      date: new Date(2025, 5, 13), // June 13, 2025
      type: "release" as const,
      description: "Best-selling Magic set featuring heroes, villains, and locations from all 16 core Final Fantasy games"
    },
    {
      id: "edge-of-eternities",
      title: "Edge of Eternities",
      date: new Date(2025, 7, 1), // August 1, 2025
      type: "release" as const,
      description: "Space-fantasy set introducing aliens and strange new worlds to Magic"
    },
    {
      id: "spider-man",
      title: "Marvel's Spider-Man (Universes Beyond)",
      date: new Date(2025, 8, 26), // September 26, 2025
      type: "release" as const,
      description: "Spider-Man and rogues gallery including Green Goblin, Doc Oc, and Venom"
    },
    {
      id: "avatar",
      title: "Avatar: The Last Airbender (Universes Beyond)",
      date: new Date(2025, 10, 21), // November 21, 2025
      type: "release" as const,
      description: "Aang and company with elemental showdown mechanics"
    },

    // Secret Lair Drops
    {
      id: "animar-friends",
      title: "Secret Lair: Animar and Friends",
      date: new Date(2025, 1, 3), // February 3, 2025
      type: "other" as const,
      description: "Five-card set with art from Jack Teagle including Mulldrifter and Animar, Soul of Elements"
    },
    {
      id: "jesper-ejsing",
      title: "Secret Lair: Artist Series - Jesper Ejsing",
      date: new Date(2025, 1, 10), // February 10, 2025
      type: "other" as const,
      description: "Four cards with artwork from Danish illustrator Jesper Ejsing"
    },
    {
      id: "arcade-racers",
      title: "Secret Lair: Arcade Racers",
      date: new Date(2025, 1, 10), // February 10, 2025
      type: "other" as const,
      description: "Pixel art arcade-themed cards including Big Score and Final Fortune"
    },
    {
      id: "cats-vs-dogs",
      title: "Secret Lair: Cats vs Dogs",
      date: new Date(2025, 2, 17), // March 17, 2025
      type: "other" as const,
      description: "Double drop pitting canines against felines with species-specific art"
    },
    {
      id: "spongebob",
      title: "Secret Lair: SpongeBob SquarePants",
      date: new Date(2025, 2, 24), // March 24, 2025
      type: "other" as const,
      description: "SpongeBob and pals including Patrick Star, Mr. Krabs, and Squidward"
    },
    {
      id: "deadpool",
      title: "Secret Lair: Marvel's Deadpool",
      date: new Date(2025, 3, 1), // April 1, 2025
      type: "other" as const,
      description: "Fourth wall-breaking versions featuring Deadpool, Trading Card"
    },
    {
      id: "final-fantasy-secret-lair",
      title: "Secret Lair: Final Fantasy Summer Superdrop",
      date: new Date(2025, 5, 9), // June 9, 2025
      time: "9:00 AM PT",
      type: "other" as const,
      description: "Three drops: Game Over, Grimoire, and Weapons featuring Cloud's Buster Sword and more"
    },

    // Prerelease Events (typically 1 week before release)
    {
      id: "aetherdrift-prerelease",
      title: "Aetherdrift Prerelease",
      date: new Date(2025, 1, 7), // February 7, 2025
      time: "Various times",
      location: "Local Game Stores",
      type: "prerelease" as const,
      description: "Prerelease event for Aetherdrift racing set"
    },
    {
      id: "tarkir-prerelease",
      title: "Tarkir Dragonstorm Prerelease",
      date: new Date(2025, 3, 4), // April 4, 2025
      time: "Various times",
      location: "Local Game Stores",
      type: "prerelease" as const,
      description: "Prerelease event for Tarkir Dragonstorm"
    },
    {
      id: "final-fantasy-prerelease",
      title: "Final Fantasy Prerelease",
      date: new Date(2025, 5, 6), // June 6, 2025
      time: "Various times",
      location: "Local Game Stores",
      type: "prerelease" as const,
      description: "Prerelease event for the highly anticipated Final Fantasy set"
    },
    {
      id: "edge-prerelease",
      title: "Edge of Eternities Prerelease",
      date: new Date(2025, 6, 25), // July 25, 2025
      time: "Various times",
      location: "Local Game Stores",
      type: "prerelease" as const,
      description: "Prerelease event for the space-fantasy Edge of Eternities"
    },
    {
      id: "spider-man-prerelease",
      title: "Spider-Man Prerelease",
      date: new Date(2025, 8, 19), // September 19, 2025
      time: "Various times",
      location: "Local Game Stores",
      type: "prerelease" as const,
      description: "Prerelease event for Marvel's Spider-Man set"
    }
  ];
};

const sampleEvents: CalendarEvent[] = getMTG2025Events();

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventTypeColor(type: CalendarEvent["type"]) {
  switch (type) {
    case "tournament":
      return "bg-red-600 text-red-100";
    case "release":
      return "bg-blue-600 text-blue-100";
    case "prerelease":
      return "bg-purple-600 text-purple-100";
    case "draft":
      return "bg-green-600 text-green-100";
    default:
      return "bg-gray-600 text-gray-100";
  }
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of the month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get events for the current month
  const monthEvents = sampleEvents.filter(event => 
    event.date.getFullYear() === year && event.date.getMonth() === month
  );

  // Get events for a specific day
  function getEventsForDay(day: number) {
    return monthEvents.filter(event => event.date.getDate() === day);
  }

  function navigateMonth(direction: "prev" | "next") {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Calendar Grid */}
      <div className="lg:col-span-3">
        <div className="bg-black border border-gray-700 rounded-xl p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth("next")}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-3 h-24"></div>;
              }

              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

              return (
                <div
                  key={`day-${day}`}
                  className={`p-2 h-24 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors ${
                    isToday ? "bg-blue-900/30 border-blue-600" : "bg-gray-800/50"
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? "text-blue-400" : "text-white"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left text-xs px-1 py-0.5 rounded truncate ${getEventTypeColor(event.type)} hover:opacity-80 transition-opacity`}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Details Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-black border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Event Details</h3>
          
          {selectedEvent ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-white mb-2">{selectedEvent.title}</h4>
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(selectedEvent.type)}`}>
                  {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4" />
                  {selectedEvent.date.toLocaleDateString()}
                </div>
                
                {selectedEvent.time && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    {selectedEvent.time}
                  </div>
                )}
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.location}
                  </div>
                )}
              </div>
              
              {selectedEvent.description && (
                <div>
                  <h5 className="font-medium text-white mb-1">Description</h5>
                  <p className="text-sm text-gray-300">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Click on an event to view details</p>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-black border border-gray-700 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {sampleEvents
              .filter(event => event.date >= new Date())
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 5)
              .map(event => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white text-sm">{event.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {event.date.toLocaleDateString()}
                        {event.time && ` • ${event.time}`}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${getEventTypeColor(event.type)}`}>
                      {event.type}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
} 