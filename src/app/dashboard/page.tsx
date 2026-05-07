"use client";

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { mockGroups, currentUser, mockExpenses, mockSettlements } from '@/lib/mock-data';
import { Users, Plus, TrendingUp, TrendingDown, ChevronRight, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { getGroupBalances } from '@/lib/debt-simplifier';

export default function Dashboard() {
  const [groups, setGroups] = useState(mockGroups);

  const calculateUserOverallBalance = () => {
    let total = 0;
    groups.forEach(group => {
      const balances = getGroupBalances(group.members, mockExpenses.filter(e => e.groupId === group.id), mockSettlements.filter(s => s.groupId === group.id));
      const userBalance = balances.find(b => b.userId === currentUser.id)?.balance || 0;
      total += userBalance;
    });
    return total;
  };

  const overallBalance = calculateUserOverallBalance();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName={currentUser.name} />
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-headline font-bold">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Here's what's happening in your groups.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-card/40 border p-4 rounded-2xl backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Balance</span>
              <span className={`text-2xl font-headline font-bold ${overallBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {overallBalance >= 0 ? '+' : ''}${Math.abs(overallBalance).toFixed(2)}
              </span>
            </div>
            <div className={`p-2 rounded-xl ${overallBalance >= 0 ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
              {overallBalance >= 0 ? <TrendingUp /> : <TrendingDown />}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-dashed border-2 bg-transparent flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:border-primary transition-colors">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <CardTitle className="mb-2">New Group</CardTitle>
            <p className="text-sm text-muted-foreground mb-6">Create a shared space for a trip, house, or project.</p>
            <Button className="w-full">Create Group</Button>
          </Card>

          {groups.map(group => {
            const balances = getGroupBalances(group.members, mockExpenses.filter(e => e.groupId === group.id), mockSettlements.filter(s => s.groupId === group.id));
            const userBal = balances.find(b => b.userId === currentUser.id)?.balance || 0;
            
            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="h-full glass-card hover:bg-white/5 transition-all group overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Users className="text-accent h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {group.members.map(member => (
                        <div key={member.id} className="w-7 h-7 rounded-full bg-muted border border-background flex items-center justify-center text-[10px] font-bold" title={member.name}>
                          {member.name.charAt(0)}
                        </div>
                      ))}
                      {group.members.length > 3 && <div className="text-xs text-muted-foreground self-center">+{group.members.length - 3} more</div>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Your Standing</p>
                      {userBal === 0 ? (
                        <p className="text-sm font-medium">You are all settled up</p>
                      ) : (
                        <p className={`text-lg font-bold ${userBal > 0 ? 'text-primary' : 'text-destructive'}`}>
                          {userBal > 0 ? 'You are owed' : 'You owe'} ${Math.abs(userBal).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Card>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}