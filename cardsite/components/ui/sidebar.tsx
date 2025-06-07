import { 
  Home, 
  Search, 
  Layers, 
  Users, 
  Trophy, 
  TrendingUp, 
  BookOpen, 
  Video,
  MessageCircle,
  Star,
  Settings,
  HelpCircle
} from "lucide-react";
import React from "react";

export const Sidebar = React.memo(function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-32 bg-black overflow-y-auto z-50">
      <div className="p-4">
        <nav className="space-y-1">
          <a href="/" className="flex items-center px-3 py-2 text-white bg-black rounded-lg">
            Home
          </a>
          <a href="/cards" className="flex items-center px-3 py-2 text-gray-400 hover:text-white bg-black rounded-lg">
            Cards
          </a>
        </nav>
      </div>
    </aside>
  );
}); 