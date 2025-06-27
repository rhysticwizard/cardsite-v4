'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  ThumbsUp,
  Heart,
  Share,
  MoreHorizontal,
  Globe,
  Smile,
  Camera,
  Image,
  Gift,
  Laugh,
  Frown,
  Angry
} from 'lucide-react';
import Link from 'next/link';

// Fetch post data
async function fetchPost(postId: string) {
  const response = await fetch(`/api/forums/posts/${postId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch post');
  }
  const data = await response.json();
  return data.post;
}

// Sample comments data
const sampleComments = [
  {
    id: 1,
    content: 'Omg!! Why are those animals so ridiculously cute!!',
    author: {
      username: 'Sarah Mitchell',
      avatar: 'https://via.placeholder.com/32x32/FF6B6B/ffffff?text=SM',
      displayName: 'Sarah Mitchell'
    },
    createdAt: '2024-09-27T07:00:00Z',
    likes: 0,
    replies: [
      {
        id: 2,
        content: 'I know right! They\'re absolutely adorable 🥰',
        author: {
          username: 'Mike Johnson',
          avatar: 'https://via.placeholder.com/32x32/4ECDC4/ffffff?text=MJ',
          displayName: 'Mike Johnson'
        },
        createdAt: '2024-09-27T07:23:00Z',
        likes: 1
      }
    ]
  }
];

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}

function CommentComponent({ comment, isReply = false }: { comment: any; isReply?: boolean }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = () => {
    if (replyContent.trim()) {
      console.log('Reply:', replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  return (
    <div className={`flex gap-2 mb-2 ${isReply ? 'ml-8' : ''}`}>
      <img
        src={comment.author.avatar}
        alt={comment.author.displayName}
        className="w-8 h-8 rounded-full flex-shrink-0"
      />
      <div className="flex-1">
        <div className="bg-gray-800 rounded-2xl px-3 py-2 max-w-fit">
          <div className="font-semibold text-sm text-white">
            {comment.author.displayName}
          </div>
          <div className="text-sm text-white">
            {comment.content}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
          <span>{formatTime(comment.createdAt)}</span>
          <button className="hover:underline font-semibold">Like</button>
          <button className="hover:underline font-semibold" onClick={() => setShowReplyForm(!showReplyForm)}>
            Reply
          </button>
          {comment.likes > 0 && (
            <>
              <span className="flex items-center gap-1 text-blue-600 bg-blue-100 rounded-full px-2 py-1">
                <ThumbsUp className="w-3 h-3 fill-current" />
                {comment.likes}
              </span>
            </>
          )}
        </div>

        {showReplyForm && (
          <div className="mt-2 flex gap-2">
            <img
              src="https://via.placeholder.com/32x32/4CAF50/ffffff?text=YU"
              alt="Your avatar"
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-full px-3 py-2 text-sm border-none outline-none pr-12"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && replyContent.trim()) {
                    handleReply();
                  }
                }}
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                Insert an emoji
              </button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.map((reply: any) => (
          <div key={reply.id} className="mt-2">
            <CommentComponent comment={reply} isReply={true} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PostPage({ params }: PostPageProps) {
  const { id: postId } = React.use(params);
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showEmojiTooltip, setShowEmojiTooltip] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState({
    like: 12,
    love: 8,
    laugh: 3,
    wow: 2,
    sad: 0,
    angry: 1
  });

  const reactions = [
    { name: 'like', icon: '👍', color: '#1877f2' },
    { name: 'love', icon: '❤️', color: '#e91e63' },
    { name: 'laugh', icon: '😂', color: '#f39c12' },
    { name: 'wow', icon: '😮', color: '#f39c12' },
    { name: 'sad', icon: '😢', color: '#f39c12' },
    { name: 'angry', icon: '😠', color: '#e74c3c' }
  ];

  const handleReaction = (reactionName: string) => {
    setReactionCounts(prev => {
      const newCounts = { ...prev };
      
      // Remove previous reaction if any
      if (userReaction) {
        newCounts[userReaction as keyof typeof newCounts]--;
      }
      
      // Add new reaction if different from current
      if (reactionName !== userReaction) {
        newCounts[reactionName as keyof typeof newCounts]++;
        setUserReaction(reactionName);
      } else {
        setUserReaction(null);
      }
      
      return newCounts;
    });
    setShowReactionPicker(false);
  };

  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  const activeReactions = Object.entries(reactionCounts)
    .filter(([_, count]) => count > 0)
    .sort(([,a], [,b]) => b - a);

  // Fetch post data on mount
  React.useEffect(() => {
    async function loadPost() {
      try {
        setLoading(true);
        const postData = await fetchPost(postId);
        setPost({
          id: postData.id,
          title: postData.title,
          content: postData.content,
          author: {
            username: postData.username || postData.name || 'Unknown User',
            avatar: postData.image || 'https://via.placeholder.com/40x40/4CAF50/ffffff?text=' + (postData.username?.[0] || postData.name?.[0] || 'U'),
            isVerified: false,
            displayName: postData.username || postData.name || 'Unknown User'
          },
          createdAt: postData.createdAt,
          reactions: { like: 0, love: 0, total: 0 },
          comments: postData.replyCount || 0,
          shares: 0,
          hasVideo: false,
          privacy: 'public',
          category: postData.category,
          subcategory: postData.subcategory,
          views: postData.views || 0,
          isPinned: postData.isPinned || false,
          isLocked: postData.isLocked || false
        });
      } catch (err) {
        console.error('Failed to fetch post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [postId]);

  const handleAddComment = () => {
    if (newComment.trim()) {
      console.log('New comment:', newComment);
      setNewComment('');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading post...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">Post not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between text-gray-400 text-sm">
          <div className="flex items-center space-x-4">
            <Link href="/forums" className="hover:text-white">Forums</Link>
            <span>/</span>
            <Link href="/forums/general-discussion" className="hover:text-white">General Discussion</Link>
            <span>/</span>
            <span className="text-white font-medium">Post</span>
          </div>
        </div>

        {/* Break Line */}
        <hr className="border-gray-600 mb-6" />

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
        {/* Facebook Post Card */}
        <div className="bg-black rounded-lg shadow-sm mb-4">
          {/* Post Header */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.displayName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-white text-sm">
                      {post.author.displayName}
                    </span>
                    {post.author.isVerified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span>{formatDate(post.createdAt)}</span>
                    <span>•</span>
                    <Globe className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-800">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="text-white text-sm mb-3">
              {post.content}
            </div>
          </div>

          {/* Video/Image Content - Removed for actual posts */}
          
          {/* Reactions Summary */}
          <div className="px-4 py-2 border-b border-gray-800">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-1">
                {totalReactions > 0 && (
                  <>
                    <div className="flex -space-x-1">
                      {activeReactions.map(([reactionName]: [string, number]) => {
                        const reaction = reactions.find(r => r.name === reactionName);
                        return (
                          <div key={reactionName} className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-black" style={{backgroundColor: reaction?.color}}>
                            <span className="text-xs">{reaction?.icon}</span>
                          </div>
                        );
                      })}
                    </div>
                    <span className="ml-2">{totalReactions}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span>{post.comments} Comments</span>
                <span>{post.shares} Share</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-2 border-b border-gray-800">
            <div className="flex items-center justify-around">
              <div className="relative flex-1">
                <button 
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer hover:text-accent-foreground h-9 px-4 has-[>svg]:px-3 w-full justify-center py-2 ${
                    userReaction ? 'text-blue-500 hover:text-blue-400' : 'text-gray-400 hover:bg-gray-800'
                  }`}
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                >
                  {userReaction ? (
                    <>
                      <span className="text-lg mr-1">{reactions.find(r => r.name === userReaction)?.icon}</span>
                      {userReaction.charAt(0).toUpperCase() + userReaction.slice(1)}
                    </>
                  ) : (
                    <>
                      <Smile className="w-5 h-5 mr-2" />
                      React
                    </>
                  )}
                </button>
                
                {/* Reaction Picker */}
                {showReactionPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setShowReactionPicker(false)}
                    />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 border border-gray-700 rounded-full px-3 py-2 flex gap-2 shadow-xl z-20">
                      {reactions.map((reaction) => (
                        <button
                          key={reaction.name}
                          className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-800 transition-all transform hover:scale-125 relative group"
                          onClick={() => handleReaction(reaction.name)}
                        >
                          <span className="text-2xl">{reaction.icon}</span>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {reaction.name.charAt(0).toUpperCase() + reaction.name.slice(1)}
                          </div>
                          {reactionCounts[reaction.name as keyof typeof reactionCounts] > 0 && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {reactionCounts[reaction.name as keyof typeof reactionCounts]}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Button variant="ghost" className="flex-1 text-gray-400 hover:bg-gray-800 justify-center py-2">
                <MessageCircle className="w-5 h-5 mr-2" />
                Comment
              </Button>
              <Button variant="ghost" className="flex-1 text-gray-400 hover:bg-gray-800 justify-center py-2">
                <Share className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="p-4">
            {/* Add Comment */}
            <div className="flex gap-2 mb-4">
              <img
                src="https://via.placeholder.com/32x32/4CAF50/ffffff?text=YU"
                alt="Your avatar"
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-full px-3 py-2 text-sm border-none outline-none pr-20"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      handleAddComment();
                    }
                  }}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <button className="text-gray-400 hover:text-gray-300">
                    <Smile className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-300">
                    <Camera className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-300">
                    <Gift className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div>
              {sampleComments.map((comment) => (
                <CommentComponent key={comment.id} comment={comment} />
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
} 