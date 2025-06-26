'use client';

import DeckBox3D from '@/components/mtg/deck-box-3d';

export default function DeckBoxDemo() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          3D Deck Box Demo
        </h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Lightning Bolt Deck</h2>
            <DeckBox3D 
              deckName="Lightning Aggro"
              cardCount={60}
              width={300}
              height={400}
              cardArtUrl="https://cards.scryfall.io/art_crop/front/f/2/f29ba16f-c8fb-42fe-aabf-87089cb214a7.jpg"
              onClick={() => console.log('Clicked Lightning Aggro deck')}
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Black Lotus Deck</h2>
            <DeckBox3D 
              deckName="Power Nine"
              cardCount={60}
              width={300}
              height={400}
              cardArtUrl="https://cards.scryfall.io/art_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg"
              onClick={() => console.log('Clicked Power Nine deck')}
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Ancestral Recall Deck</h2>
            <DeckBox3D 
              deckName="Blue Control"
              cardCount={60}
              width={300}
              height={400}
              cardArtUrl="https://cards.scryfall.io/art_crop/front/2/3/2398892d-28e9-4009-81ec-0d544af79d2b.jpg"
              onClick={() => console.log('Clicked Blue Control deck')}
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Shivan Dragon Deck</h2>
            <DeckBox3D 
              deckName="Dragon Tribal"
              cardCount={100}
              width={300}
              height={400}
              cardArtUrl="https://cards.scryfall.io/art_crop/front/2/2/227cf1b5-f85b-41fe-be98-66e383652039.jpg"
              onClick={() => console.log('Clicked Dragon Tribal deck')}
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Serra Angel Deck</h2>
            <DeckBox3D 
              deckName="Angel Tribal"
              cardCount={60}
              width={300}
              height={400}
              cardArtUrl="https://cards.scryfall.io/art_crop/front/9/0/9067f035-82eb-4d85-8c40-5d8145f5d4b7.jpg"
              onClick={() => console.log('Clicked Angel Tribal deck')}
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl text-white mb-4">Plain White Deck</h2>
            <DeckBox3D 
              deckName="Draft Special"
              cardCount={40}
              width={300}
              height={400}
              onClick={() => console.log('Clicked Draft deck')}
            />
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">
            Hover over the deck boxes to see the 3D perspective shift effect!
          </p>
          <p className="text-gray-500 text-sm mb-2">
            Built with Three.js and WebGL for smooth 3D rendering
          </p>
          <p className="text-gray-500 text-sm">
            Card art is overlaid as textures when provided - otherwise defaults to clean white boxes
          </p>
        </div>
      </div>
    </div>
  );
} 