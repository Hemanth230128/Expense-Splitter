"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar({ userName }: { userName?: string }) {
  const router = useRouter();

  const handleLogout = () => {
    // In a real app, clear sessions here
    router.push('/');
  };

  return (
    <nav className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Wallet className="text-primary-foreground h-6 w-6" />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight hidden sm:block">
            SplitWise<span className="text-accent">Pro</span>
          </span>
        </Link>

        {userName ? (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">Premium Member</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}