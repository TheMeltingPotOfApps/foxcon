'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Maximize2 } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
}

const videos: Video[] = [
  {
    id: '1',
    title: 'Journey Builder Overview',
    description: 'Learn how to create your first automation journey in 5 minutes',
    duration: '5:23',
    thumbnail: '🎬',
  },
  {
    id: '2',
    title: 'PBX System Demo',
    description: 'See how our cloud PBX system works for your team',
    duration: '8:15',
    thumbnail: '📞',
  },
  {
    id: '3',
    title: 'AI-Powered Automation',
    description: 'Discover how AI enhances your customer journeys',
    duration: '6:42',
    thumbnail: '🤖',
  },
];

export function VideoSection() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {videos.map((video, idx) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
        >
          <Card className="border-2 hover-lift overflow-hidden group cursor-pointer">
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <div className="text-6xl">{video.thumbnail}</div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full w-16 h-16"
                  onClick={() => setPlayingId(playingId === video.id ? null : video.id)}
                >
                  {playingId === video.id ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                {video.duration}
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold mb-1">{video.title}</h3>
              <p className="text-sm text-muted-foreground">{video.description}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

