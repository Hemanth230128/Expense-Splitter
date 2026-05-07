"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Loader2, Wand2 } from 'lucide-react';
import { Group, User, ExpenseParticipant } from '@/lib/types';
import { parseNaturalLanguageExpense } from '@/ai/flows/natural-language-expense-input';
import { useToast } from '@/hooks/use-toast';

interface AIExpenseFormProps {
  group: Group;
  onAdd: (expense: any) => void;
}

export function AIExpenseForm({ group, onAdd }: AIExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAIParse = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const result = await parseNaturalLanguageExpense({
        expenseString: input,
        groupMembers: group.members.map(m => m.name)
      });

      // Find user IDs by matching names
      const payer = group.members.find(m => m.name.toLowerCase() === result.paidBy.toLowerCase());
      if (!payer) throw new Error(`Could not find payer: ${result.paidBy}`);

      const participants: ExpenseParticipant[] = result.participants.map(name => {
        const user = group.members.find(m => m.name.toLowerCase() === name.toLowerCase());
        if (!user) return null;
        
        // If custom split for this person exists in AI result
        const custom = result.customSplits?.find(s => s.member.toLowerCase() === name.toLowerCase());
        if (custom) return { userId: user.id, amount: custom.amount };

        // Otherwise assume equal split of remainder
        // This is a simplification; a production app would calculate this more precisely
        const splitAmount = result.amount / result.participants.length;
        return { userId: user.id, amount: splitAmount };
      }).filter(p => p !== null) as ExpenseParticipant[];

      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        groupId: group.id,
        description: result.description,
        amount: result.amount,
        paidBy: payer.id,
        participants,
        date: new Date().toISOString()
      });

      toast({ title: 'AI successfully parsed expense!', description: `Recorded "${result.description}" for $${result.amount}` });
      setOpen(false);
      setInput('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Parsing failed', description: err.message || 'Could not understand the command. Try more detail.' });
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
            Just describe what happened. Example: "I paid $45 for pizza for Sarah and Priya. Priya owes $5 extra."
          </p>
          <Textarea 
            placeholder="Type your expense details..." 
            className="min-h-[120px] bg-muted/20 border-accent/20 focus:border-accent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span className="font-bold uppercase tracking-widest text-accent/50">Pro Tip:</span>
            <span>Use member names exactly as they appear in the group.</span>
          </div>
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