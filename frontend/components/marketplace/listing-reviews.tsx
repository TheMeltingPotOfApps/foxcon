'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import {
  useListingReviews,
  useListingReviewStats,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';

interface ListingReviewsProps {
  listingId: string;
  canReview?: boolean;
}

export function ListingReviews({ listingId, canReview = true }: ListingReviewsProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const { data: reviews = [], isLoading: reviewsLoading } = useListingReviews(listingId);
  const { data: stats, isLoading: statsLoading } = useListingReviewStats(listingId);
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const handleSubmit = async () => {
    if (editingReviewId) {
      await updateReview.mutateAsync({
        reviewId: editingReviewId,
        data: { rating, comment: comment || undefined },
      });
      setEditingReviewId(null);
    } else {
      await createReview.mutateAsync({
        listingId,
        data: { rating, comment: comment || undefined },
      });
    }
    setShowForm(false);
    setRating(5);
    setComment('');
  };

  const handleEdit = (review: any) => {
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment || '');
    setShowForm(true);
  };

  const handleDelete = async (reviewId: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      await deleteReview.mutateAsync(reviewId);
    }
  };

  if (statsLoading) {
    return <div className="animate-pulse">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(stats.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
            {stats.ratingDistribution && (
              <div className="mt-4 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingDistribution[star] || 0;
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm w-8">{star}★</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle>{editingReviewId ? 'Edit Review' : 'Write a Review'}</CardTitle>
            <CardDescription>
              Share your experience with this listing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={createReview.isPending || updateReview.isPending}
              >
                {editingReviewId ? 'Update Review' : 'Submit Review'}
              </Button>
              {showForm && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingReviewId(null);
                    setRating(5);
                    setComment('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Reviews ({reviews.length})
        </h3>
        {reviewsLoading ? (
          <div className="animate-pulse">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No reviews yet. Be the first to review!
            </CardContent>
          </Card>
        ) : (
          reviews.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {review.isVerifiedPurchase && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm mt-2">{review.comment}</p>
                    )}
                  </div>
                  {canReview && review.buyerId === (typeof window !== 'undefined' ? localStorage.getItem('userId') : null) && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(review)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(review.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


