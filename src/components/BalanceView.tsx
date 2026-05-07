"use client";

import { NetBalance, SuggestedTransaction } from '@/lib/types';
import { calculateSimplifiedDebts } from '@/lib/debt-simplifier';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BalanceView({ balances, onSettle }: { balances: NetBalance[], onSettle: (tx: SuggestedTransaction) => void }) {
  const suggestedTransactions = calculateSimplifiedDebts(balances);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-headline flex items-center gap-2">
            <CheckCircle2 className="text-primary h-5 w-5" /> Current Standings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {balances.map(b => (
            <div key={b.userId} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {b.userName.charAt(0)}
                </div>
                <span className="font-medium">{b.userName}</span>
              </div>
              <span className={`font-bold ${b.balance > 0 ? 'text-primary' : b.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {b.balance > 0 ? '+' : ''}{b.balance.toFixed(2)}
              </span>
            </div>
          ))}
          {balances.length === 0 && <p className="text-center py-4 text-muted-foreground">No members yet.</p>}
        </CardContent>
      </Card>

      <Card className="glass-card border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg font-headline flex items-center gap-2">
            <AlertCircle className="text-accent h-5 w-5" /> Optimized Settlements
          </CardTitle>
          <p className="text-xs text-muted-foreground">We've calculated the minimum number of transactions to clear all debts.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestedTransactions.length > 0 ? (
            suggestedTransactions.map((tx, i) => (
              <div key={i} className="group flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/10 hover:border-accent/30 transition-all gap-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-bold text-destructive">{tx.fromName}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                  <span className="font-bold text-primary">{tx.toName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-headline font-bold text-accent">${tx.amount.toFixed(2)}</span>
                  <Button size="sm" variant="outline" className="h-8 border-accent/30 hover:bg-accent text-accent hover:text-accent-foreground" onClick={() => onSettle(tx)}>
                    Record Payment
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">Everyone is settled up! Good job.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}