import { User } from "lucide-react";
import React from "react";

export const Navigation = React.memo(function Navigation() {
  return (
    <nav className="bg-black px-6 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-end w-full">
        {/* Profile icon at absolute far right */}
        <button className="text-white hover:text-gray-300 transition-colors">
          <User className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}); 