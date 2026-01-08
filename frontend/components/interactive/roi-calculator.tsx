'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, DollarSign, Users, MessageSquare } from 'lucide-react';

export function ROICalculator() {
  const [monthlyLeads, setMonthlyLeads] = useState(1000);
  const [conversionRate, setConversionRate] = useState(2);
  const [averageDealValue, setAverageDealValue] = useState(500);
  const [currentResponseTime, setCurrentResponseTime] = useState(24);

  // Calculate ROI improvements
  const currentConversions = (monthlyLeads * conversionRate) / 100;
  const currentRevenue = currentConversions * averageDealValue;
  
  // With automation: 3x faster response = 2.5x conversion rate improvement
  const improvedConversionRate = conversionRate * 2.5;
  const improvedConversions = (monthlyLeads * improvedConversionRate) / 100;
  const improvedRevenue = improvedConversions * averageDealValue;
  
  const revenueIncrease = improvedRevenue - currentRevenue;
  const roiPercentage = currentRevenue > 0 ? ((revenueIncrease / currentRevenue) * 100).toFixed(1) : 0;
  const annualIncrease = revenueIncrease * 12;
  
  // Cost savings from automation (assuming $50/month per agent, 2 agents saved)
  const monthlySavings = 100;
  const annualSavings = monthlySavings * 12;
  const totalAnnualValue = annualIncrease + annualSavings;

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          ROI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="leads">Monthly Leads</Label>
            <Input
              id="leads"
              type="number"
              value={monthlyLeads}
              onChange={(e) => setMonthlyLeads(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="conversion">Current Conversion Rate (%)</Label>
            <Input
              id="conversion"
              type="number"
              step="0.1"
              value={conversionRate}
              onChange={(e) => setConversionRate(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="deal">Average Deal Value ($)</Label>
            <Input
              id="deal"
              type="number"
              value={averageDealValue}
              onChange={(e) => setAverageDealValue(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="response">Current Response Time (hours)</Label>
            <Input
              id="response"
              type="number"
              value={currentResponseTime}
              onChange={(e) => setCurrentResponseTime(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Current Monthly Revenue</div>
              <div className="text-2xl font-bold">${currentRevenue.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-lg bg-primary/10">
              <div className="text-sm text-muted-foreground mb-1">With Automation</div>
              <div className="text-2xl font-bold text-primary">${improvedRevenue.toLocaleString()}</div>
            </div>
          </div>

          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold">Monthly Revenue Increase</span>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="text-4xl font-bold text-primary mb-2">
              +${revenueIncrease.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {roiPercentage}% improvement • ${annualIncrease.toLocaleString()} annually
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Users className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Conversions</div>
              <div className="font-bold">{currentConversions.toFixed(0)} → {improvedConversions.toFixed(0)}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <MessageSquare className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Response Time</div>
              <div className="font-bold">{currentResponseTime}h → 1h</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Total Annual Value</div>
              <div className="font-bold">${totalAnnualValue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

