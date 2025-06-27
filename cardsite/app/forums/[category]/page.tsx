'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  User,
  Search
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
  params: Promise<{
    category: string;
  }>;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { category: categoryParam } = React.use(params);
  const category = forumCategories.find(cat => cat.slug === categoryParam);
  
  // State for posts
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'unknown';
    }
  };

  // Fetch posts for this category
  useEffect(() => {
    async function fetchPosts() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/forums/posts?category=${categoryParam}&limit=20`);
        const data = await response.json();
        
        if (response.ok) {
          setPosts(data.posts || []);
        } else {
          console.error('Failed to fetch posts:', data.error);
          setPosts(sampleTopics); // Fallback to sample data
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setPosts(sampleTopics); // Fallback to sample data
      } finally {
        setIsLoading(false);
      }
    }

    if (categoryParam) {
      fetchPosts();
    }
  }, [categoryParam]);
  
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
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-xl mx-auto">
          <Input
            placeholder="Search topics and discussions..."
            className="bg-black border-gray-600 text-white pl-4 pr-12 py-3 rounded-md focus:ring-0 focus:ring-offset-0 focus:border-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-600"
          />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center justify-between text-gray-400 text-sm">
        <div className="flex items-center space-x-4">
          <Link href="/forums" className="hover:text-white">Forums</Link>
          <span>/</span>
          <span className="text-white font-medium">{category.name}</span>
        </div>
        <Link href="/forums/create">
          <Button className="bg-transparent hover:bg-transparent">
            Create New Topic
            <MessageCircle className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Break Line */}
      <hr className="border-gray-600 mb-6" />



      {/* Topics */}
      <div className="mb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-400">Loading posts...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-4">Be the first to start a discussion in this category!</p>
            <Link href="/forums/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Create First Post
              </Button>
            </Link>
          </div>
        ) : (
          /* Topics List */
          <div className="space-y-2">
            {posts.map((post) => (
              <Card key={post.id} className="bg-black border-gray-800 hover:border-gray-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {post.isPinned && (
                          <Pin className="w-4 h-4 text-yellow-500" />
                        )}
                        <Link href={`/forums/post/${post.id}`}>
                          <h3 className="text-white font-medium hover:text-blue-400 cursor-pointer">
                            {post.title}
                          </h3>
                        </Link>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {post.username || post.name || `User #${post.userId?.slice(-4) || 'Unknown'}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {post.replyCount || 0} replies
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.views || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {post.subcategory && (
                        <div className="text-xs text-gray-500 mb-1">{post.subcategory}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>


      </div>
    </div>
  );
} 