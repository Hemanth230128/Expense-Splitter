"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Loader2, Wand2 } from 'lucide-react';
import { parseNaturalLanguageExpense } from '@/ai/flows/natural-language-expense-input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AIExpenseFormProps {
  group: any;
  members: any[];
}

export function AIExpenseForm({ group, members }: AIExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  const handleAIParse = async () => {
    if (!input || !db) return;
    setLoading(true);
    try {
      const result = await parseNaturalLanguageExpense({
        expenseString: input,
        groupMembers: members.map(m => m.nickname || 'Unknown')
      });

      const payer = members.find(m => (m.nickname || '').toLowerCase() === result.paidBy.toLowerCase());
      if (!payer) throw new Error(`Could not find member matching: ${result.paidBy}`);

      const participants = result.participants.map(name => {
        const member = members.find(m => (m.nickname || '').toLowerCase() === name.toLowerCase());
        if (!member) return null;
        
        const custom = result.customSplits?.find(s => s.member.toLowerCase() === name.toLowerCase());
        if (custom) return { userId: member.userId, amount: custom.amount };

        const splitAmount = result.amount / result.participants.length;
        return { userId: member.userId, amount: splitAmount };
      }).filter(p => p !== null);

      const expenseId = doc(collection(db, 'groups', group.id, 'expenses')).id;
      const expenseRef = doc(db, 'groups', group.id, 'expenses', expenseId);

      await setDoc(expenseRef, {
        id: expenseId,
        groupId: group.id,
        description: result.description,
        totalAmount: result.amount,
        amount: result.amount,
        paidById: payer.userId,
        paidBy: payer.userId,
        expenseDate: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants,
        groupMembers: group.members
      });

      toast({ title: 'AI successfully parsed expense!', description: `Recorded "${result.description}" for $${result.amount}` });
      setOpen(false);
      setInput('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Parsing failed', description: err.message || 'Could not understand the command.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-accent/50 text-accent hover:bg-accent/10">
          <BrainCircuit className="h-4 w-4" /> Quick AI Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <BrainCircuit className="text-accent" /> AI Assistant
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Just describe what happened. Example: "I paid $45 for pizza for Sarah and Priya."
          </p>
          <Textarea 
            placeholder="Type your expense details..." 
            className="min-h-[120px] bg-muted/20 border-accent/20 focus:border-accent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAIParse} disabled={loading || !input} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Magic Parse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}