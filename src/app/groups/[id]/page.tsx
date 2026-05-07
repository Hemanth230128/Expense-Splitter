"use client";

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockGroups, currentUser, mockExpenses, mockSettlements } from '@/lib/mock-data';
import { ExpenseForm } from '@/components/ExpenseForm';
import { AIExpenseForm } from '@/components/AIExpenseForm';
import { BalanceView } from '@/components/BalanceView';
import { getGroupBalances } from '@/lib/debt-simplifier';
import { History, LayoutDashboard, ArrowLeft, ArrowUpDown, Calendar, DollarSign, User as UserIcon, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GroupPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const group = mockGroups.find(g => g.id === id);
  const [expenses, setExpenses] = useState(mockExpenses.filter(e => e.groupId === id));
  const [settlements, setSettlements] = useState(mockSettlements.filter(s => s.groupId === id));
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'payer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const balances = useMemo(() => {
    if (!group) return [];
    return getGroupBalances(group.members, expenses, settlements);
  }, [group, expenses, settlements]);

  if (!group) return <div>Group not found</div>;

  const handleAddExpense = (newExp: any) => {
    setExpenses([newExp, ...expenses]);
  };

  const handleRecordSettlement = (tx: any) => {
    const newSet = {
      id: Math.random().toString(36).substr(2, 9),
      groupId: group.id,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      date: new Date().toISOString()
    };
    setSettlements([...settlements, newSet]);
    toast({ title: 'Settlement recorded!', description: `${tx.fromName} paid ${tx.toName} $${tx.amount.toFixed(2)}` });
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortBy === 'amount') comparison = a.amount - b.amount;
    else if (sortBy === 'payer') comparison = (group.members.find(m => m.id === a.paidBy)?.name || '').localeCompare(group.members.find(m => m.id === b.paidBy)?.name || '');
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'date' | 'amount' | 'payer') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName={currentUser.name} />
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-headline font-bold">{group.name}</h1>
              <p className="text-muted-foreground text-sm">{group.members.length} members &bull; {expenses.length} expenses</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <AIExpenseForm group={group} onAdd={handleAddExpense} />
            <ExpenseForm group={group} currentUser={currentUser} onAdd={handleAddExpense} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card/50 border h-12">
            <TabsTrigger value="overview" className="gap-2 px-6"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 px-6"><History className="h-4 w-4" /> History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <BalanceView balances={balances} onSettle={handleRecordSettlement} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between bg-card/40 border p-3 rounded-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Sort By</span>
              <div className="flex gap-2">
                <Button variant={sortBy === 'date' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('date')} className="h-8 gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Date
                  {sortBy === 'date' && <ArrowUpDown className="h-3 w-3" />}
                </Button>
                <Button variant={sortBy === 'amount' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('amount')} className="h-8 gap-2">
                  <DollarSign className="h-3.5 w-3.5" /> Amount
                  {sortBy === 'amount' && <ArrowUpDown className="h-3 w-3" />}
                </Button>
                <Button variant={sortBy === 'payer' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('payer')} className="h-8 gap-2">
                  <UserIcon className="h-3.5 w-3.5" /> Payer
                  {sortBy === 'payer' && <ArrowUpDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedExpenses.length > 0 ? (
                sortedExpenses.map(exp => (
                  <div key={exp.id} className="glass-card p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(exp.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(exp.date).getDate()}</span>
                      </div>
                      <div>
                        <h4 className="font-bold">{exp.description}</h4>
                        <p className="text-xs text-muted-foreground">
                          Paid by <span className="text-foreground font-medium">{group.members.find(m => m.id === exp.paidBy)?.name}</span> &bull; 
                          Split with {exp.participants.length} people
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-headline font-bold">${exp.amount.toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Amount</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-10" />
                  <p>No expenses recorded yet.</p>
                </div>
              )}

              {settlements.map(set => (
                <div key={set.id} className="p-4 rounded-2xl border border-dashed border-accent/20 bg-accent/5 flex items-center justify-between opacity-80">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Settlement Recorded</h4>
                      <p className="text-xs text-muted-foreground">
                        {group.members.find(m => m.id === set.from)?.name} paid {group.members.find(m => m.id === set.to)?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">${set.amount.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}