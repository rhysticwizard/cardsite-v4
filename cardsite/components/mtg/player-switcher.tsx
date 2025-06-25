'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface GameParticipant {
  id: string;
  userId: string;
  deckId?: string;
  seatPosition: number;
  status: string;
  user: {
    id: string;
    username: string;
  };
  deck?: {
    id: string;
    name: string;
    format: string;
  };
}

interface PlayerSwitcherProps {
  participants: GameParticipant[];
  currentUserId: string;
  activeViewUserId: string;
  onPlayerSwitch: (userId: string) => void;
}

export function PlayerSwitcher({ 
  participants, 
  currentUserId, 
  activeViewUserId, 
  onPlayerSwitch 
}: PlayerSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Sort participants to put current user first
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return a.seatPosition - b.seatPosition;
  });

  const isSpectating = activeViewUserId !== currentUserId;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
      <div className="bg-black/90 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Spectator Mode Indicator */}
          {isSpectating && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
              <Eye className="w-4 h-4" />
              Spectating
            </div>
          )}
          
          {/* Player Avatars */}
          <div className="flex items-center gap-2">
            {sortedParticipants.map((participant) => {
              const isCurrentUser = participant.userId === currentUserId;
              const isActiveView = participant.userId === activeViewUserId;
              const isOnline = participant.status === 'active'; // You can update this based on real connection status
              
              return (
                <div key={participant.id} className="relative">
                  <Button
                    variant="ghost"
                    className={`
                      relative h-10 w-10 rounded-full p-0 transition-all duration-200
                      ${isActiveView 
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black scale-110' 
                        : 'hover:scale-105 hover:ring-2 hover:ring-gray-500 hover:ring-offset-1 hover:ring-offset-black'
                      }
                      ${isCurrentUser ? 'ring-green-500' : ''}
                    `}
                    onClick={() => onPlayerSwitch(participant.userId)}
                    disabled={participant.userId === activeViewUserId}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.user.username}`} 
                        alt={participant.user.username} 
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm">
                        {participant.user.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Online Status Indicator */}
                    <div className={`
                      absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black
                      ${isOnline ? 'bg-green-500' : 'bg-gray-500'}
                    `} />
                    
                    {/* Current User Crown */}
                    {isCurrentUser && (
                      <div className="absolute -top-1 -right-1 text-yellow-400 text-xs">
                        👑
                      </div>
                    )}
                  </Button>
                  
                  {/* Player Name Tooltip */}
                  <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {participant.user.username}
                    {isCurrentUser && ' (You)'}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Return to Your Board Button */}
          {isSpectating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPlayerSwitch(currentUserId)}
              className="bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/40 hover:text-blue-300 text-xs"
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Your Board
            </Button>
          )}
        </div>
        
        {/* Player Info Row */}
        <div className="mt-2 text-center text-xs text-gray-400">
          {(() => {
            const activePlayer = participants.find(p => p.userId === activeViewUserId);
            if (!activePlayer) return null;
            
            const isYou = activePlayer.userId === currentUserId;
            return (
              <div>
                Viewing: <span className="text-white font-medium">{activePlayer.user.username}</span>
                {isYou && <span className="text-green-400"> (Your board)</span>}
                {!isYou && <span className="text-yellow-400"> (Read-only)</span>}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
} 