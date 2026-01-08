'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

export function Journey3DVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 3D-like journey visualization
    const nodes = [
      { x: 0.2, y: 0.2, label: 'Start', size: 30 },
      { x: 0.4, y: 0.3, label: 'SMS', size: 25 },
      { x: 0.6, y: 0.4, label: 'Delay', size: 25 },
      { x: 0.8, y: 0.3, label: 'Call', size: 25 },
      { x: 0.5, y: 0.6, label: 'End', size: 30 },
    ];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections with 3D effect
      nodes.forEach((node, i) => {
        if (i < nodes.length - 1) {
          const nextNode = nodes[i + 1];
          const x1 = node.x * canvas.width;
          const y1 = node.y * canvas.height;
          const x2 = nextNode.x * canvas.width;
          const y2 = nextNode.y * canvas.height;

          // Gradient line for 3D effect
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          gradient.addColorStop(0, 'rgba(38, 38, 38, 0.3)');
          gradient.addColorStop(1, 'rgba(38, 38, 38, 0.1)');

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });

      // Draw nodes with 3D shadow effect
      nodes.forEach((node) => {
        const x = node.x * canvas.width;
        const y = node.y * canvas.height;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, node.size, 0, Math.PI * 2);
        ctx.fill();

        // Node
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, node.size);
        gradient.addColorStop(0, 'rgba(38, 38, 38, 0.9)');
        gradient.addColorStop(1, 'rgba(38, 38, 38, 0.6)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, node.size, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, x, y);
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <Card className="border-2 shadow-xl overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
          <h3 className="text-xl font-bold mb-4 text-center">3D Journey Visualization</h3>
          <canvas
            ref={canvasRef}
            className="w-full h-64 rounded-lg"
            style={{ background: 'transparent' }}
          />
          <p className="text-sm text-muted-foreground text-center mt-4">
            Interactive 3D visualization of your customer journey flow
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

