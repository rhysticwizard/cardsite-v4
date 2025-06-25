import { GameStateDemo } from '@/components/game/game-state-demo'

export default function ArchitectureDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4 mb-4">
        <h1 className="text-2xl font-bold">🎮 New Game Architecture Demo</h1>
        <p className="text-sm opacity-90">
          Testing the new component architecture - completely isolated from existing deck builder!
        </p>
      </div>
      <GameStateDemo />
    </div>
  )
} 