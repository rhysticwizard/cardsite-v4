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
  Gift
} from 'lucide-react';
import Link from 'next/link';

// Sample post data
const samplePost = {
  id: 1,
  content: `These quokkas have the cutest reaction to juggling! 😍`,
  author: {
    username: 'Yahoo News Australia',
    avatar: 'https://via.placeholder.com/40x40/1877f2/ffffff?text=Y',
    isVerified: true,
    displayName: 'Yahoo News Australia'
  },
  createdAt: '2024-09-27T05:00:00Z',
  reactions: {
    like: 3,
    love: 2,
    total: 5
  },
  comments: 2,
  shares: 1,
  hasVideo: true,
  videoThumbnail: 'https://via.placeholder.com/600x400/8B4513/FFFFFF?text=Quokkas+Video',
  privacy: 'public'
};

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
  params: {
    id: string;
  };
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
        <div className="bg-gray-100 rounded-2xl px-3 py-2 max-w-fit">
          <div className="font-semibold text-sm text-gray-900">
            {comment.author.displayName}
          </div>
          <div className="text-sm text-gray-900">
            {comment.content}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
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
                className="w-full bg-gray-100 rounded-full px-3 py-2 text-sm border-none outline-none pr-12"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && replyContent.trim()) {
                    handleReply();
                  }
                }}
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
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
  const [newComment, setNewComment] = useState('');
  const [showEmojiTooltip, setShowEmojiTooltip] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center space-x-2 text-gray-600 text-sm">
          <Link href="/forums" className="hover:text-blue-600">Forums</Link>
          <span>/</span>
          <Link href="/forums/general-discussion" className="hover:text-blue-600">General Discussion</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Post</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto py-4">
        {/* Facebook Post Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          {/* Post Header */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={samplePost.author.avatar}
                  alt={samplePost.author.displayName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {samplePost.author.displayName}
                    </span>
                    {samplePost.author.isVerified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>{formatDate(samplePost.createdAt)}</span>
                    <span>•</span>
                    <Globe className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-100">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="text-gray-900 text-sm mb-3">
              {samplePost.content}
            </div>
          </div>

          {/* Video/Image Content */}
          {samplePost.hasVideo && (
            <div className="relative">
              <img
                src={samplePost.videoThumbnail}
                alt="Post content"
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <div className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-0 h-0 border-l-6 border-r-0 border-t-4 border-b-4 border-l-white border-t-transparent border-b-transparent ml-1"></div>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 rounded px-2 py-1">
                0:09 / 0:49
              </div>
            </div>
          )}

          {/* Reactions Summary */}
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                    <ThumbsUp className="w-3 h-3 text-white fill-current" />
                  </div>
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                    <Heart className="w-3 h-3 text-white fill-current" />
                  </div>
                </div>
                <span className="ml-2">{samplePost.reactions.total}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>{samplePost.comments} Comments</span>
                <span>{samplePost.shares} Share</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-around">
              <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 justify-center py-2">
                <ThumbsUp className="w-5 h-5 mr-2" />
                Like
              </Button>
              <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 justify-center py-2">
                <MessageCircle className="w-5 h-5 mr-2" />
                Comment
              </Button>
              <Button variant="ghost" className="flex-1 text-gray-600 hover:bg-gray-100 justify-center py-2">
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
                  className="w-full bg-gray-100 rounded-full px-3 py-2 text-sm border-none outline-none pr-20"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      handleAddComment();
                    }
                  }}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <button className="text-gray-500 hover:text-gray-700">
                    <Smile className="w-4 h-4" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <Camera className="w-4 h-4" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
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
  );
} 