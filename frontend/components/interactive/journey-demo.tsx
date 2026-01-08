'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JourneyStep {
  id: string;
  type: 'sms' | 'call' | 'delay' | 'condition';
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

export function JourneyDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [steps] = useState<JourneyStep[]>([
    {
      id: '1',
      type: 'sms',
      title: 'Welcome Message',
      description: 'Send personalized welcome SMS',
      status: 'completed',
    },
    {
      id: '2',
      type: 'delay',
      title: 'Wait 24 Hours',
      description: 'Delay before next step',
      status: 'completed',
    },
    {
      id: '3',
      type: 'sms',
      title: 'Follow-up Offer',
      description: 'Send special discount code',
      status: 'active',
    },
    {
      id: '4',
      type: 'condition',
      title: 'Check Response',
      description: 'Did customer reply?',
      status: 'pending',
    },
    {
      id: '5',
      type: 'call',
      title: 'Personal Call',
      description: 'Schedule callback if interested',
      status: 'pending',
    },
  ]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const getStepStatus = (index: number): 'pending' | 'active' | 'completed' => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return '💬';
      case 'call':
        return '📞';
      case 'delay':
        return '⏱️';
      case 'condition':
        return '🔀';
      default:
        return '📋';
    }
  };

  return (
    <Card className="border-2 shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold mb-1">Interactive Journey Demo</h3>
            <p className="text-sm text-muted-foreground">Watch how a customer journey flows</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: status === 'pending' ? 0.5 : 1,
                  x: 0,
                  scale: status === 'active' ? 1.02 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                  status === 'active'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : status === 'completed'
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-muted bg-muted/30'
                }`}
              >
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                    status === 'active'
                      ? 'bg-primary/20'
                      : status === 'completed'
                      ? 'bg-green-500/20'
                      : 'bg-muted'
                  }`}>
                    {getTypeIcon(step.type)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{step.title}</h4>
                    <Badge
                      variant={
                        status === 'active'
                          ? 'default'
                          : status === 'completed'
                          ? 'default'
                          : 'secondary'
                      }
                      className={
                        status === 'completed'
                          ? 'bg-green-500 text-white'
                          : ''
                      }
                    >
                      {status === 'active' && '▶ Active'}
                      {status === 'completed' && '✓ Done'}
                      {status === 'pending' && '○ Pending'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`absolute left-6 top-16 w-0.5 h-8 ${
                    status === 'completed' ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

