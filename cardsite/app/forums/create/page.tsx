'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Users, 
  Trophy, 
  Layers3, 
  Scale, 
  Smile,
  Megaphone,
  HelpCircle,
  Target,
  Crown,
  BookOpen,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  List,
  ListOrdered,
  Quote,
  Code,
  Plus,
  Camera
} from 'lucide-react';
import Link from 'next/link';

// Forum categories data
const forumCategories = [
  {
    id: 1,
    slug: 'general-discussion',
    name: 'General Discussion',
    icon: MessageCircle,
    subcategories: [
      { name: 'Introductions', icon: Users },
      { name: 'Announcements', icon: Megaphone },
      { name: 'Questions & Answers', icon: HelpCircle }
    ]
  },
  {
    id: 2,
    slug: 'strategy-gameplay',
    name: 'Strategy & Gameplay',
    icon: Trophy,
    subcategories: [
      { name: 'Competitive Play', icon: Target },
      { name: 'Commander', icon: Crown },
      { name: 'New Player Strategies', icon: BookOpen }
    ]
  },
  {
    id: 3,
    slug: 'deck-building',
    name: 'Deck Building',
    icon: Layers3,
    subcategories: [
      { name: 'Standard', icon: Target },
      { name: 'Modern', icon: Crown },
      { name: 'Commander', icon: BookOpen }
    ]
  },
  {
    id: 4,
    slug: 'rules-rulings',
    name: 'Rules & Rulings',
    icon: Scale,
    subcategories: [
      { name: 'Rules Questions', icon: HelpCircle },
      { name: 'Judge Corner', icon: Crown },
      { name: 'Complex Interactions', icon: Target }
    ]
  },
  {
    id: 5,
    slug: 'jokes-humor',
    name: 'Jokes & Humor',
    icon: Smile,
    subcategories: [
      { name: 'Memes & Images', icon: Camera },
      { name: 'Funny Game Stories', icon: MessageCircle },
      { name: 'Card Puns', icon: Smile }
    ]
  }
];

export default function CreatePostPage() {
  const [selectedCategory, setSelectedCategory] = useState('general-discussion');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const currentCategory = forumCategories.find(cat => cat.slug === selectedCategory);
  const CategoryIcon = currentCategory?.icon || MessageCircle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Creating post:', { title, selectedCategory, selectedSubcategory, content });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center space-x-4 text-gray-400 text-sm">
        <Link href="/forums" className="hover:text-white">Categories</Link>
        <span>/</span>
        <Link href={`/forums/${selectedCategory}`} className="hover:text-white">
          {currentCategory?.name || 'General Discussion'}
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Create Post</span>
      </div>

      {/* Break Line */}
      <hr className="border-gray-600 mb-6" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Create Post Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6 space-y-6">
            {/* Title Input */}
            <div>
              <Input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-lg"
                required
              />
            </div>

            {/* Category Selection */}
            <div>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory(''); // Reset subcategory when category changes
                  }}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded-md px-4 py-3 pr-10 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {forumCategories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <CategoryIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Subcategory Selection */}
            {currentCategory && (
              <div>
                <p className="text-gray-400 text-sm mb-3">Choose a subcategory (optional):</p>
                <div className="flex flex-wrap gap-2">
                  {currentCategory.subcategories.map((sub, index) => {
                    const SubIcon = sub.icon;
                    return (
                      <Button
                        key={index}
                        type="button"
                        variant={selectedSubcategory === sub.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSubcategory(selectedSubcategory === sub.name ? '' : sub.name)}
                        className={`flex items-center gap-2 ${
                          selectedSubcategory === sub.name 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <SubIcon className="w-4 h-4" />
                        {sub.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rich Text Editor Toolbar */}
            <div className="border-b border-gray-700 pb-2">
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Underline className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Strikethrough className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-gray-600 mx-2" />
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Link2 className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <List className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <ListOrdered className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Quote className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Code className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <Textarea
                placeholder="Text (required)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 min-h-[200px] resize-none"
                required
              />
            </div>

            {/* Attachment Buttons */}
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full w-8 h-8 p-0">
                <Plus className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full w-8 h-8 p-0">
                <Camera className="w-4 h-4" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Link href="/forums">
                <Button type="button" variant="outline" className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!title.trim() || !content.trim()}
              >
                Create Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Community Guidelines Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4">Posting to CardSite V3</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>Remember to be respectful and follow the community guidelines</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>No spamming or excessive self-promotion</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>Use appropriate tags and categories for your content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>Posts that violate community rules may be removed</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </form>
    </div>
  );
} 