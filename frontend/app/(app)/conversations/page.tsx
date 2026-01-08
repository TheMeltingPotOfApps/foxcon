'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, Bot } from 'lucide-react';
import { useConversations } from '@/lib/hooks/use-conversations';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const { data: conversations = [], isLoading } = useConversations(
    filter === 'all' ? undefined : { status: filter.toUpperCase() }
  );

  const filteredConversations = conversations.filter((conv) => {
    const contactName = `${conv.contact?.firstName || ''} ${conv.contact?.lastName || ''}`.trim();
    const phoneNumber = conv.contact?.phoneNumber || conv.contact?.phone || '';
    return (
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phoneNumber.includes(searchQuery)
    );
  });

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">Manage your SMS conversations</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('open')}
          >
            Open
          </Button>
          <Button
            variant={filter === 'closed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('closed')}
          >
            Closed
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>
                {filteredConversations.length} conversation
                {filteredConversations.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || filter !== 'all'
                      ? 'No conversations match your filters'
                      : 'No conversations yet'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Conversations will appear here when contacts reply to your campaigns
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conv) => (
                    <Link key={conv.id} href={`/conversations/${conv.id}`}>
                      <div className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {conv.contact?.firstName} {conv.contact?.lastName}
                              </span>
                              <Badge variant={conv.status === 'OPEN' ? 'success' : 'secondary'}>
                                {conv.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {conv.contact?.phoneNumber || conv.contact?.phone}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </motion.div>
  );
}
