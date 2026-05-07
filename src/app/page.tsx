"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { Wallet, Users, ArrowRightLeft, BrainCircuit } from 'lucide-react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center space-y-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Intelligent Expense Management
            </div>
            
            <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight leading-tight">
              Group spending, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-gradient">simplified.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Stop stressing over who owes who. SplitWisePro handles the math, optimizes your debts, and settles up in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="h-12 px-8 text-lg font-semibold w-full sm:w-auto shadow-xl shadow-primary/20 subtle-hover" asChild>
                <Link href="/login">Get Started Free</Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg font-semibold w-full sm:w-auto subtle-hover" asChild>
                <Link href="/login">Explore Features</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-12">
            {[
              {
                icon: BrainCircuit,
                title: "AI Parsing",
                desc: "Type naturally: 'I paid $50 for dinner for everyone' and let our engine handle the rest.",
                color: "text-accent"
              },
              {
                icon: ArrowRightLeft,
                title: "Debt Optimizer",
                desc: "Minimize the number of transactions required to settle all group debts automatically.",
                color: "text-primary"
              },
              {
                icon: Users,
                title: "Private Groups",
                desc: "Secure spaces for trips, housemates, and projects with granular access control.",
                color: "text-white"
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl glass-card subtle-hover group transition-all duration-300">
                <feature.icon className={`h-8 w-8 mb-4 ${feature.color}`} />
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground bg-black/10">
        <p>&copy; 2024 SplitWisePro. Simple. Secure. Social.</p>
      </footer>
    </div>
  );
}
