'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Timeline data matching the screenshot
const timelinePeriods = [
  {
    id: 'pre-history',
    name: 'Pre-History',
    events: [
      {
        date: 'Unknown',
        title: 'The Elder Dragon War',
        description: 'A conflict between Elder Dragons and other ancient races of Dominaria.'
      },
      {
        date: 'Unknown',
        title: 'Ancient Vrashino Civilization',
        description: 'An early civilization of vrashino rises and falls on Dominaria.'
      }
    ]
  },
  {
    id: 'mythohistory',
    name: 'Mythohistory',
    events: [
      {
        date: 'c. -20,000 AR',
        title: 'The Time of Dragons',
        description: 'Elder Dragons rule Dominaria, with the five Primeval Dragons as the most powerful.'
      },
      {
        date: 'c. -15,000 AR',
        title: 'The Dragon War',
        description: 'A war between the Elder Dragons that nearly extinguishes their race.'
      },
      {
        date: 'c. -15,000 AR',
        title: 'The Fall of the Primevals',
        description: 'The five Primeval Dragons disappear after the Elder Dragon War.'
      }
    ]
  }
];

const navigationTabs = [
  { id: 'timeline', name: 'Timeline', active: true },
  { id: 'storyline', name: 'Storyline', active: false },
  { id: 'characters', name: 'Characters', active: false },
  { id: 'locations', name: 'Locations', active: false }
];

export default function LorePage() {
  const [activeTab, setActiveTab] = useState('timeline');

  return (
    <>
      {/* Navigation Header */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex items-center justify-center mb-4 pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-4">
            {navigationTabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`h-8 rounded-md gap-1.5 px-3 text-sm font-medium border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-gray-600'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {tab.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      {activeTab === 'timeline' && (
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-px bg-gray-600 h-full"></div>
            
            <div className="space-y-16">
              {timelinePeriods.map((period, periodIndex) => (
                <div key={period.id} className="relative">
                  {/* Period Header */}
                  <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center">
                      <h2 className="text-3xl font-bold text-white mr-6">
                        {period.name}
                      </h2>
                      <div className="w-4 h-4 bg-white rounded-full relative z-10"></div>
                    </div>
                  </div>

                  {/* Period Events */}
                  <div className="space-y-8">
                    {period.events.map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className="relative flex items-start"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-400 rounded-full z-10"></div>
                        
                        {/* Event Content - Right Side */}
                        <div className="w-1/2 ml-auto pl-12">
                          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-gray-400 text-sm font-medium">
                                {event.date}
                              </span>
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-3">
                              {event.title}
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder for other tabs */}
      {activeTab !== 'timeline' && (
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-white mb-4">
              {navigationTabs.find(tab => tab.id === activeTab)?.name}
            </h2>
            <p className="text-gray-400">
              This section will be populated with lore content later.
            </p>
          </div>
        </div>
      )}
    </>
  );
} 