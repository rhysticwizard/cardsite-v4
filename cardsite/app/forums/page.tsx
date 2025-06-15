'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageCircle, 
  Users, 
  Trophy, 
  Layers3, 
  Scale, 
  Smile,
  Pin,
  Megaphone,
  HelpCircle,
  Target,
  Crown,
  BookOpen,
  Gavel,
  AlertTriangle,
  Zap,
  Image,
  Coffee,
  Hash
} from 'lucide-react';

// Forum categories data matching the screenshot
const forumCategories = [
  {
    id: 1,
    name: 'General Discussion',
    description: 'Discuss anything related to trading card games that doesn\'t fit into other categories. General questions, announcements, and community discussions.',
    icon: MessageCircle,
    topics: '1,248 topics',
    replies: '8,632 replies',
    participants: '2,421 participants',
    subcategories: [
      { name: 'Introductions', topics: '248 topics', replies: '1,432 replies', icon: Users },
      { name: 'Announcements', topics: '57 topics', replies: '684 replies', icon: Megaphone },
      { name: 'Questions & Answers', topics: '943 topics', replies: '6,516 replies', icon: HelpCircle }
    ]
  },
  {
    id: 2,
    name: 'Strategy & Gameplay',
    description: 'Discuss gameplay strategies, card interactions, and competitive play. Share tips, tricks, and get advice on improving your game.',
    icon: Trophy,
    topics: '2,187 topics',
    replies: '15,241 replies',
    participants: '3,214 participants',
    subcategories: [
      { name: 'Competitive Play', topics: '843 topics', replies: '5,829 replies', icon: Target },
      { name: 'Commander', topics: '976 topics', replies: '7,054 replies', icon: Crown },
      { name: 'New Player Strategies', topics: '368 topics', replies: '2,358 replies', icon: BookOpen }
    ]
  },
  {
    id: 3,
    name: 'Deck Building',
    description: 'Share your deck ideas, get feedback on your builds, and discuss deck archetypes across all formats.',
    icon: Layers3,
    topics: '3,458 topics',
    replies: '21,876 replies',
    participants: '5,643 participants',
    subcategories: [
      { name: 'Standard', topics: '1,654 topics', replies: '8,432 replies', icon: Pin },
      { name: 'Modern', topics: '768 topics', replies: '6,432 replies', icon: Zap },
      { name: 'Commander', topics: '1,036 topics', replies: '7,012 replies', icon: Crown }
    ]
  },
  {
    id: 4,
    name: 'Rules & Rulings',
    description: 'Ask questions about rules, card interactions, and official rulings. Get clarification on complex game mechanics.',
    icon: Scale,
    topics: '1,876 topics',
    replies: '12,543 replies',
    participants: '4,321 participants',
    subcategories: [
      { name: 'Rules Questions', topics: '1,243 topics', replies: '8,765 replies', icon: HelpCircle },
      { name: 'Judge Corner', topics: '453 topics', replies: '2,765 replies', icon: Gavel },
      { name: 'Complex Interactions', topics: '180 topics', replies: '1,013 replies', icon: AlertTriangle }
    ]
  },
  {
    id: 5,
    name: 'Jokes & Humor',
    description: 'Share your funniest card game jokes, memes, and humorous stories. A lighthearted place to enjoy some laughs with the community.',
    icon: Smile,
    topics: '567 topics',
    replies: '4,321 replies',
    participants: '2,154 participants',
    subcategories: [
      { name: 'Memes & Images', topics: '255 topics', replies: '1,587 replies', icon: Image },
      { name: 'Funny Game Stories', topics: '189 topics', replies: '1,532 replies', icon: Coffee },
      { name: 'Card Puns', topics: '123 topics', replies: '1,202 replies', icon: Hash }
    ]
  }
];

function CategoryCard({ category }: { category: typeof forumCategories[0] }) {
  const IconComponent = category.icon;
  
  return (
    <Card className="bg-black border-gray-800 hover:border-gray-700 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-white text-lg font-semibold">
              {category.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm leading-relaxed">
            {category.description}
          </p>
          


          {/* Subcategories */}
          <div className="space-y-2">
            {category.subcategories.map((sub, index) => {
              const SubIcon = sub.icon;
              return (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <SubIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-white text-sm font-medium">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{sub.topics}</span>
                    <span>•</span>
                    <span>{sub.replies}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ForumsPage() {
  return (
    <>
      {/* Centered container layout with generous horizontal margins */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">CATEGORIES</h1>
          <div className="w-full h-px bg-gray-800"></div>
        </div>

        {/* Forum Categories */}
        <div className="space-y-6">
          {forumCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </>
  );
} 