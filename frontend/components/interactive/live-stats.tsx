'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Phone, Users, TrendingUp, Zap, Globe } from 'lucide-react';

interface Stat {
  icon: typeof MessageSquare;
  label: string;
  value: number;
  suffix: string;
  color: string;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stat[]>([
    { icon: MessageSquare, label: 'Messages Sent', value: 1247893, suffix: '', color: 'text-blue-500' },
    { icon: Phone, label: 'Calls Made', value: 456789, suffix: '', color: 'text-green-500' },
    { icon: Users, label: 'Active Users', value: 12345, suffix: '', color: 'text-purple-500' },
    { icon: TrendingUp, label: 'Avg Response Time', value: 12, suffix: 'min', color: 'text-orange-500' },
    { icon: Zap, label: 'Journeys Active', value: 8923, suffix: '', color: 'text-pink-500' },
    { icon: Globe, label: 'Countries', value: 47, suffix: '', color: 'text-cyan-500' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prevStats => 
        prevStats.map(stat => ({
          ...stat,
          value: stat.value + Math.floor(Math.random() * 10),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
        >
          <Card className="border-2 hover-lift">
            <CardContent className="p-4 text-center">
              <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={stat.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-2xl font-bold mb-1"
                >
                  {stat.value.toLocaleString()}{stat.suffix && ` ${stat.suffix}`}
                </motion.div>
              </AnimatePresence>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

