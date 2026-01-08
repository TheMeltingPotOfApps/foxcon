'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  image: string;
  rating: number;
  text: string;
  results: string[];
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Marketing Director',
    company: 'TechFlow Inc.',
    image: '👩‍💼',
    rating: 5,
    text: 'Journey automation transformed our lead nurturing process. We saw a 3x increase in conversion rates within the first month.',
    results: ['3x conversion increase', '50% faster response time', '$250K additional revenue'],
  },
  {
    id: 2,
    name: 'Michael Rodriguez',
    role: 'Sales Manager',
    company: 'GrowthCo',
    image: '👨‍💼',
    rating: 5,
    text: 'The PBX system is incredible. Our team can handle 2x more calls without hiring additional staff. The ROI is outstanding.',
    results: ['2x call capacity', '40% cost reduction', '99% uptime'],
  },
  {
    id: 3,
    name: 'Emily Watson',
    role: 'Customer Success Lead',
    company: 'SaaS Solutions',
    image: '👩‍💻',
    rating: 5,
    text: 'Automated journeys helped us reduce churn by 35%. The visual builder makes it so easy to create complex workflows.',
    results: ['35% churn reduction', '4.8/5 customer satisfaction', '60% time saved'],
  },
  {
    id: 4,
    name: 'David Kim',
    role: 'Operations Director',
    company: 'RetailMax',
    image: '👨‍💻',
    rating: 5,
    text: 'The combination of SMS and calls in one platform is game-changing. We recovered $500K in abandoned carts last quarter.',
    results: ['$500K recovered', '45% cart recovery rate', '2.5x ROI'],
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
                    {testimonials[currentIndex].image}
                  </div>
                </div>
                <div className="flex-1">
                  <Quote className="h-8 w-8 text-primary/30 mb-4" />
                  <p className="text-lg mb-6 leading-relaxed">
                    &ldquo;{testimonials[currentIndex].text}&rdquo;
                  </p>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="mb-4">
                    <div className="font-bold text-lg">{testimonials[currentIndex].name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonials[currentIndex].role} at {testimonials[currentIndex].company}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {testimonials[currentIndex].results.map((result, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-primary/10 text-sm font-medium text-primary"
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-4 mt-6">
        <Button variant="outline" size="icon" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-2">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-primary w-8' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

