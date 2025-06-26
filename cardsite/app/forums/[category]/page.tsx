'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Hash,
  ArrowLeft,
  Eye,
  Clock,
  User
} from 'lucide-react';
import Link from 'next/link';

// Forum categories data (same as main forums page)
const forumCategories = [
  {
    id: 1,
    slug: 'general-discussion',
    name: 'General Discussion',
    description: 'Discuss anything related to trading card games that doesn\'t fit into other categories.',
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
    slug: 'strategy-gameplay',
    name: 'Strategy & Gameplay',
    description: 'Discuss gameplay strategies, card interactions, and competitive play.',
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
    slug: 'deck-building',
    name: 'Deck Building',
    description: 'Share your deck ideas, get feedback on your builds, and discuss deck archetypes.',
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
    slug: 'rules-rulings',
    name: 'Rules & Rulings',
    description: 'Ask questions about rules, card interactions, and official rulings.',
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
    slug: 'jokes-humor',
    name: 'Jokes & Humor',
    description: 'Share your funniest card game jokes, memes, and humorous stories.',
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

// Sample topics for demonstration
const sampleTopics = [
  {
    id: 1,
    title: 'Welcome to the General Discussion forum!',
    author: 'ModeratorTeam',
    replies: 23,
    views: 1547,
    lastActivity: '2 hours ago',
    isPinned: true,
    subcategory: 'Announcements'
  },
  {
    id: 2,
    title: 'What\'s your favorite card from the newest set?',
    author: 'CardLover2024',
    replies: 87,
    views: 2341,
    lastActivity: '15 minutes ago',
    isPinned: false,
    subcategory: 'General'
  },
  {
    id: 3,
    title: 'New player here - where should I start?',
    author: 'NewbieMage',
    replies: 42,
    views: 856,
    lastActivity: '1 hour ago',
    isPinned: false,
    subcategory: 'Questions & Answers'
  },
  {
    id: 4,
    title: 'Monthly community tournament announcement',
    author: 'EventCoordinator',
    replies: 156,
    views: 4567,
    lastActivity: '3 hours ago',
    isPinned: true,
    subcategory: 'Announcements'
  },
  {
    id: 5,
    title: 'Tell us about your most memorable game!',
    author: 'StoryTeller',
    replies: 234,
    views: 8923,
    lastActivity: '45 minutes ago',
    isPinned: false,
    subcategory: 'General'
  }
];

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const category = forumCategories.find(cat => cat.slug === params.category);
  
  if (!category) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Category Not Found</h1>
          <Link href="/forums">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forums
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const IconComponent = category.icon;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center space-x-4 text-gray-400 text-sm">
        <Link href="/forums" className="hover:text-white">Forums</Link>
        <span>/</span>
        <span className="text-white font-medium">{category.name}</span>
      </div>

      {/* Break Line */}
      <hr className="border-gray-600 mb-6" />

      {/* Category Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{category.name}</h1>
            <p className="text-gray-400">{category.description}</p>
          </div>
        </div>
        
        {/* Category Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <span>{category.topics}</span>
          <span>•</span>
          <span>{category.replies}</span>
          <span>•</span>
          <span>{category.participants}</span>
        </div>
      </div>

      {/* Subcategories */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Subcategories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {category.subcategories.map((sub, index) => {
            const SubIcon = sub.icon;
            return (
              <Card key={index} className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <SubIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-white font-medium">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{sub.topics}</span>
                    <span>•</span>
                    <span>{sub.replies}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Topics */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Topics</h2>
          <Link href="/forums/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Create New Topic
            </Button>
          </Link>
        </div>

        {/* Topics List */}
        <div className="space-y-2">
          {sampleTopics.map((topic) => (
            <Card key={topic.id} className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {topic.isPinned && (
                        <Pin className="w-4 h-4 text-yellow-500" />
                      )}
                      <Link href={`/forums/post/${topic.id}`}>
                        <h3 className="text-white font-medium hover:text-blue-400 cursor-pointer">
                          {topic.title}
                        </h3>
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {topic.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {topic.replies} replies
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {topic.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {topic.lastActivity}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">{topic.subcategory}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="text-center">
        <Button variant="outline" className="text-gray-400 border-gray-600 hover:bg-gray-800">
          Load More Topics
        </Button>
      </div>
    </div>
  );
} 