'use client';

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return static version for SSR to prevent hydration mismatch
    return (
      <aside className="fixed left-0 top-0 h-screen w-32 bg-black overflow-y-auto z-50">
        <div className="flex flex-col justify-start h-full p-4 pt-[10vh]">
          <nav className="space-y-6">
            <a href="/" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Home
            </a>
            <a href="/cards" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Cards
            </a>
            <a href="/decks" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Decks
            </a>

            <a href="/forums" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Forums
            </a>
            <a href="/rules" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Rules
            </a>
            <a href="/lore" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Lore
            </a>
            <a href="/collections" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Collections
            </a>
            <a href="/create" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Create
            </a>
            <a href="/play" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Play
            </a>
            <a href="/playmat" className="flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Playmat
            </a>
          </nav>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-32 bg-black overflow-y-auto z-50">
      <div className="flex flex-col justify-start h-full p-4 pt-[10vh]">
        <nav className="space-y-6">
          <a 
            href="/" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Home
          </a>
          <a 
            href="/cards" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/cards' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Cards
          </a>
          <a 
            href="/decks" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/decks' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Decks
          </a>

          <a 
            href="/forums" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/forums' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Forums
          </a>
          <a 
            href="/rules" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/rules' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Rules
          </a>
          <a 
            href="/lore" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/lore' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lore
          </a>
          <a 
            href="/collections" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/collections' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Collections
          </a>
          <a 
            href="/create" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/create' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create
          </a>
          <a 
            href="/play" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/play' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Play
          </a>
          <a 
            href="/playmat" 
            className={`flex items-center justify-start px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/playmat' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Playmat
          </a>
        </nav>
      </div>
    </aside>
  );
}); 