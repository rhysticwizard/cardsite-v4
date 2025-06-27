'use client';

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

export const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load collapsed state from localStorage
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, mounted]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (!mounted) {
    // Return static version for SSR to prevent hydration mismatch
    return (
      <>
        <aside className="fixed left-0 top-0 h-screen w-32 bg-black overflow-hidden z-50 transition-all duration-300 ease-in-out">
          <div className="flex flex-col h-full">
            {/* Logo Section */}
            <div className="flex items-center justify-center py-4 px-2">
              <div className="text-center">
                <img 
                  src="/TCG3K.png" 
                  alt="TCG3K Logo" 
                  className="w-28 h-auto max-h-28 object-contain"
                />
              </div>
            </div>
            
            {/* Toggle Button */}
            <div className="flex justify-end p-2">
              <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col justify-start flex-1 p-4 pt-2">
              <nav className="space-y-6">
                <a href="/" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Home</span>
                </a>
                <a href="/play" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Play</span>
                </a>
                <a href="/cards" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Cards</span>
                </a>
                <a href="/decks" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Decks</span>
                </a>
                <a href="/rules" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Rules</span>
                </a>
                <a href="/lore" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Lore</span>
                </a>
                <a href="/create" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Create</span>
                </a>
                <a href="/forums" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Forums</span>
                </a>
                <a href="/collections" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  <span>Collections</span>
                </a>

              </nav>
            </div>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-black overflow-hidden z-50 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-0' : 'w-32'
      }`}>
        <div className="flex flex-col h-full w-32">
          {/* Logo Section */}
          <div className="flex items-center justify-center py-4 px-2">
            <div className="text-center">
              <img 
                src="/TCG3K.png" 
                alt="TCG3K Logo" 
                className="w-28 h-auto max-h-28 object-contain"
              />
            </div>
          </div>
          
          {/* Toggle Button */}
          <div className="flex justify-end p-2">
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col justify-start flex-1 p-4 pt-2">
            <nav className="space-y-6">
              <a 
                href="/" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Home</span>
              </a>
              <a 
                href="/play" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/play' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Play</span>
              </a>
              <a 
                href="/cards" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/cards' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Cards</span>
              </a>
              <a 
                href="/decks" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/decks' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Decks</span>
              </a>
              <a 
                href="/rules" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/rules' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Rules</span>
              </a>
              <a 
                href="/lore" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/lore' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Lore</span>
              </a>
              <a 
                href="/create" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/create' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Create</span>
              </a>
              <a 
                href="/forums" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/forums' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Forums</span>
              </a>
              <a 
                href="/collections" 
                className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/collections' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Collections</span>
              </a>

            </nav>
          </div>
        </div>
      </aside>

      {/* Reopen Button - Only visible when sidebar is collapsed */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="fixed top-3 left-4 z-[60] p-2 bg-black/80 backdrop-blur-sm rounded-lg hover:bg-black text-gray-400 hover:text-white transition-all duration-200 shadow-lg focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}); 