import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { Wallet, Users, ArrowRightLeft, BrainCircuit } from 'lucide-react';

export default function LandingPage() {
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
              Now with AI-Powered Expense Input
            </div>
            
            <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight leading-tight">
              Group spending, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-gradient">simplified.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Stop stressing over who owes who. SplitWisePro handles the math, optimizes your debts, and settles up in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="h-12 px-8 text-lg font-semibold w-full sm:w-auto shadow-xl shadow-primary/20" asChild>
                <Link href="/signup">Create Free Account</Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg font-semibold w-full sm:w-auto" asChild>
                <Link href="/dashboard">View Demo Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-12">
            {[
              {
                icon: BrainCircuit,
                title: "AI Input",
                desc: "Type naturally: 'Bob paid $50 for dinner for everyone' and let AI do the rest.",
                color: "text-accent"
              },
              {
                icon: ArrowRightLeft,
                title: "Debt Optimizer",
                desc: "Minimize transactions automatically using our advanced simplification engine.",
                color: "text-primary"
              },
              {
                icon: Users,
                title: "Group Hub",
                desc: "Manage trips, housemates, and dinners in separate dedicated spaces.",
                color: "text-white"
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl glass-card hover:bg-white/5 transition-colors border border-white/5 shadow-2xl">
                <feature.icon className={`h-8 w-8 mb-4 ${feature.color}`} />
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground bg-black/20">
        <p>&copy; 2024 SplitWisePro. All rights reserved.</p>
      </footer>
    </div>
  );
}