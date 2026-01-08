'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star,
  StarHalf,
  MessageSquare,
  Filter,
  Search,
  Plus,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useListings } from '@/lib/hooks/use-marketplace';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  listingId: string;
  listingName: string;
  buyerName: string;
  rating: number;
  comment: string;
  helpful: number;
  createdAt: string;
  verified: boolean;
}

export default function ReviewsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({
    listingId: '',
    rating: 0,
    comment: '',
  });

  const { data: listingsData } = useListings();
  const listings = listingsData?.listings || [];

  // Mock reviews data - in production this would come from API
  const mockReviews: Review[] = [
    {
      id: '1',
      listingId: '1',
      listingName: 'High-Quality Home Improvement Leads',
      buyerName: 'John D.',
      rating: 5,
      comment: 'Excellent quality leads! Very responsive and high conversion rate.',
      helpful: 12,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      verified: true,
    },
    {
      id: '2',
      listingId: '1',
      listingName: 'High-Quality Home Improvement Leads',
      buyerName: 'Sarah M.',
      rating: 4,
      comment: 'Good leads overall, some were outdated but most were valid.',
      helpful: 8,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      verified: true,
    },
  ];

  const filteredReviews = mockReviews.filter((review) => {
    if (filterRating !== 'all' && review.rating !== filterRating) return false;
    if (
      searchTerm &&
      !review.listingName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !review.comment.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  const averageRating =
    mockReviews.length > 0
      ? mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: mockReviews.filter((r) => r.rating === rating).length,
    percentage:
      mockReviews.length > 0
        ? (mockReviews.filter((r) => r.rating === rating).length / mockReviews.length) * 100
        : 0,
  }));

  const handleSubmitReview = () => {
    if (!reviewData.listingId) {
      toast.error('Please select a listing');
      return;
    }
    if (reviewData.rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!reviewData.comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }
    toast.success('Review submitted successfully');
    setShowReviewForm(false);
    setReviewData({ listingId: '', rating: 0, comment: '' });
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews & Ratings</h1>
          <p className="text-muted-foreground mt-1">
            Read and write reviews for marketplace listings
          </p>
        </div>
        <Button onClick={() => setShowReviewForm(!showReviewForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Write Review
        </Button>
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
            <CardDescription>Share your experience with a listing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Listing</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={reviewData.listingId}
                onChange={(e) => setReviewData({ ...reviewData, listingId: e.target.value })}
              >
                <option value="">Choose a listing...</option>
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, rating })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        rating <= reviewData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground hover:text-yellow-400'
                      } transition-colors`}
                    />
                  </button>
                ))}
                {reviewData.rating > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    {reviewData.rating} out of 5
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Your Review</Label>
              <Textarea
                placeholder="Share your experience with this listing..."
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                rows={5}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitReview}>Submit Review</Button>
              <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
              {renderStars(Math.round(averageRating), 'lg')}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Based on {mockReviews.length} reviews
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockReviews.length}</div>
            <div className="text-sm text-muted-foreground mt-2">
              Across all listings
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Verified Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {mockReviews.filter((r) => r.verified).length}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              From verified buyers
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterRating === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRating('all')}
              >
                All Ratings
              </Button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <Button
                  key={rating}
                  variant={filterRating === rating ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterRating(rating)}
                >
                  {rating} Stars
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ratingDistribution.map((dist) => (
              <div key={dist.rating} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-20">
                  <span className="text-sm font-medium">{dist.rating}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground w-16 text-right">
                  {dist.count} ({dist.percentage.toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Reviews</TabsTrigger>
          <TabsTrigger value="my-reviews">My Reviews</TabsTrigger>
          <TabsTrigger value="my-listings">Reviews for My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterRating !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Be the first to write a review'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{review.listingName}</CardTitle>
                          {review.verified && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            by {review.buyerName}
                          </span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(review.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{review.comment}</p>
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Helpful ({review.helpful})
                      </Button>
                      <Button variant="ghost" size="sm">
                        Reply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-reviews">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Write your first review to help other buyers
              </p>
              <Button onClick={() => setShowReviewForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Write Review
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-listings">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No reviews for your listings</h3>
              <p className="text-muted-foreground">
                Reviews from buyers will appear here once they rate your listings
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

