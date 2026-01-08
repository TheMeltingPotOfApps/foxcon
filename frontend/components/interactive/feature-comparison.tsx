'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface Feature {
  name: string;
  us: boolean | string;
  competitor1: boolean | string;
  competitor2: boolean | string;
}

const features: Feature[] = [
  { name: 'Visual Journey Builder', us: true, competitor1: false, competitor2: 'Limited' },
  { name: 'Cloud PBX Integration', us: true, competitor1: false, competitor2: false },
  { name: 'AI-Powered Replies', us: true, competitor1: true, competitor2: false },
  { name: 'Multi-Channel Automation', us: true, competitor1: 'SMS Only', competitor2: true },
  { name: 'Real-Time Analytics', us: true, competitor1: true, competitor2: true },
  { name: 'Call Recording & Analytics', us: true, competitor1: false, competitor2: false },
  { name: 'WebRTC Softphone', us: true, competitor1: false, competitor2: false },
  { name: 'Advanced Segmentation', us: true, competitor1: 'Basic', competitor2: true },
  { name: 'API & Webhooks', us: true, competitor1: true, competitor2: true },
  { name: '99.9% Uptime SLA', us: true, competitor1: false, competitor2: true },
];

export function FeatureComparison() {
  const [selectedPlan, setSelectedPlan] = useState<'us' | 'competitor1' | 'competitor2'>('us');

  const renderValue = (value: boolean | string) => {
    if (value === true) {
      return <Check className="h-5 w-5 text-green-500" />;
    }
    if (value === false) {
      return <X className="h-5 w-5 text-red-500" />;
    }
    return <Badge variant="secondary">{value}</Badge>;
  };

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader>
        <CardTitle>Compare Features</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">Feature</th>
                <th className="text-center p-4 font-semibold">
                  <Badge className="bg-primary text-white">Our Platform</Badge>
                </th>
                <th className="text-center p-4 font-semibold text-muted-foreground">
                  Competitor A
                </th>
                <th className="text-center p-4 font-semibold text-muted-foreground">
                  Competitor B
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <motion.tr
                  key={feature.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="p-4 font-medium">{feature.name}</td>
                  <td className="p-4 text-center">{renderValue(feature.us)}</td>
                  <td className="p-4 text-center">{renderValue(feature.competitor1)}</td>
                  <td className="p-4 text-center">{renderValue(feature.competitor2)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

