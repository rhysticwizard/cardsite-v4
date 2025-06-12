'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, Search } from 'lucide-react';

// Rules sections data matching the screenshot
const ruleSections = [
  { id: 1, title: '1. Game Concepts', expanded: false },
  { id: 2, title: '2. Parts of a Card', expanded: false },
  { id: 3, title: '3. Card Types', expanded: false },
  { id: 4, title: '4. Zones', expanded: false },
  { id: 5, title: '5. Turn Structure', expanded: false },
  { id: 6, title: '6. Spells, Abilities, and Effects', expanded: false },
  { id: 7, title: '7. Additional Rules', expanded: false },
  { id: 8, title: '8. Multiplayer Rules', expanded: false },
  { id: 9, title: '9. Casual Variants', expanded: false }
];

export default function RulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="flex text-white">
      {/* Rules-specific Left Sidebar - positioned within the main content area */}
      <div className="w-80 min-h-screen bg-gray-900 border-r border-gray-800 p-6 fixed left-32 top-16 bottom-0 overflow-y-auto">
        {/* Search Box */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-gray-600"
            />
          </div>
        </div>

        {/* Rules Version Dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rules Version:
          </label>
          <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-gray-600">
            <option>Current (April 4, 2025)</option>
          </select>
        </div>

        {/* Rules Sections */}
        <div className="space-y-1">
          {ruleSections.map((section) => (
            <div key={section.id}>
              <Button
                variant="ghost"
                onClick={() => toggleSection(section.id)}
                className="w-full justify-start text-left px-2 py-2 text-white hover:bg-gray-800 font-normal"
              >
                <ChevronRight 
                  className={`w-4 h-4 mr-2 transition-transform ${
                    expandedSections.includes(section.id) ? 'rotate-90' : ''
                  }`} 
                />
                {section.title}
              </Button>
              {/* Placeholder for subsections when expanded */}
              {expandedSections.includes(section.id) && (
                <div className="ml-6 mt-1 space-y-1">
                  <div className="text-sm text-gray-400 px-2 py-1">
                    Subsections will appear here
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area - with left margin for the rules sidebar */}
      <div className="flex-1 ml-80">
        <div className="p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Magic: The Gathering Comprehensive Rules
            </h1>
            
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Browse the complete official MTG rules with search functionality and cross-references.
            </p>
            
            <p className="text-gray-400 mb-16">
              Select a section from the sidebar or use the search function to get started.
            </p>

            {/* Placeholder for future content */}
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
              <p className="text-gray-400">
                Rule content will appear here when you select a section from the sidebar.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500">
              © 2025 Wizards of the Coast LLC. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 