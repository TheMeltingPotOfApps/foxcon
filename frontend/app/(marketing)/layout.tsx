'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/engine-logo.svg" 
                alt="Engine Logo" 
                width={120} 
                height={36}
                className="h-9 w-auto"
              />
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/features">
                <Button variant="ghost" className="hidden sm:flex">Features</Button>
              </Link>
              <Link href="/use-cases">
                <Button variant="ghost" className="hidden sm:flex">Use Cases</Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="ghost" className="hidden md:flex">How It Works</Button>
              </Link>
              <Link href="/resources">
                <Button variant="ghost" className="hidden md:flex">Resources</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link href="/book-a-call">
                <Button variant="outline">Book a Call</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Image 
                src="/engine-logo.svg" 
                alt="Engine Logo" 
                width={100} 
                height={30}
                className="h-8 w-auto mb-4"
              />
              <p className="text-sm text-muted-foreground">
                Powerful SMS automation platform for modern businesses.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/use-cases" className="hover:text-foreground">Use Cases</Link></li>
                <li><Link href="/how-it-works" className="hover:text-foreground">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link href="/security" className="hover:text-foreground">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/resources" className="hover:text-foreground">Resources</Link></li>
                <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="/integrations" className="hover:text-foreground">Integrations</Link></li>
                <li><Link href="/support" className="hover:text-foreground">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Nurture Engine. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

