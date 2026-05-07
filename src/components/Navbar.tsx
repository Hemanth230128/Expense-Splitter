"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Navbar() {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <nav className="border-b border-white/5 bg-card/40 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Wallet className="text-primary-foreground h-6 w-6" />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight hidden sm:block">
            SplitWise<span className="text-accent">Pro</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{user.displayName || 'User'}</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Active Member</span>
            </div>
            <Avatar className="h-9 w-9 border border-primary/20">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {user.displayName?.charAt(0) || <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive subtle-hover">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="subtle-hover">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="subtle-hover">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}