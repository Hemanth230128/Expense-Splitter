"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Group, User, ExpenseParticipant } from '@/lib/types';
import { Plus, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExpenseFormProps {
  group: Group;
  currentUser: User;
  onAdd: (expense: any) => void;
}

export function ExpenseForm({ group, currentUser, onAdd }: ExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [involvedUsers, setInvolvedUsers] = useState<string[]>(group.members.map(m => m.id));
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (splitType === 'equal' && amount && involvedUsers.length > 0) {
      const splitAmount = (parseFloat(amount) / involvedUsers.length).toFixed(2);
      const newCustom: Record<string, string> = {};
      involvedUsers.forEach(id => newCustom[id] = splitAmount);
      setCustomAmounts(newCustom);
    }
  }, [amount, involvedUsers, splitType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || involvedUsers.length === 0) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
      return;
    }

    const totalAmount = parseFloat(amount);
    const participants: ExpenseParticipant[] = involvedUsers.map(userId => ({
      userId,
      amount: parseFloat(customAmounts[userId] || '0')
    }));

    const totalParticipantsAmount = participants.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalParticipantsAmount - totalAmount) > 0.05) {
      toast({ variant: 'destructive', title: 'Split mismatch', description: 'Participant totals must equal the total expense amount.' });
      return;
    }

    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      groupId: group.id,
      description,
      amount: totalAmount,
      paidBy,
      participants,
      date: new Date().toISOString()
    });

    toast({ title: 'Expense added!', description: `Successfully recorded "${description}"` });
    setOpen(false);
    reset();
  };

  const reset = () => {
    setDescription('');
    setAmount('');
    setPaidBy(currentUser.id);
    setInvolvedUsers(group.members.map(m => m.id));
    setSplitType('equal');
    setCustomAmounts({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Record New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" placeholder="What was it for?" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount ($)</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payer">Paid By</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger id="payer">
                    <SelectValue placeholder="Select payer" />
                  </SelectTrigger>
                  <SelectContent>
                    {group.members.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted/40 rounded-xl border">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-bold uppercase tracking-wider opacity-60">Split among participants</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={splitType === 'equal' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setSplitType('equal')}>Equal</Button>
                  <Button type="button" variant={splitType === 'custom' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setSplitType('custom')}>Custom</Button>
                </div>
              </div>
              
              <div className="grid gap-3">
                {group.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`user-${member.id}`} 
                        checked={involvedUsers.includes(member.id)} 
                        onCheckedChange={(checked) => {
                          if (checked) setInvolvedUsers([...involvedUsers, member.id]);
                          else setInvolvedUsers(involvedUsers.filter(id => id !== member.id));
                        }} 
                      />
                      <Label htmlFor={`user-${member.id}`} className="text-sm cursor-pointer">{member.name}</Label>
                    </div>
                    {involvedUsers.includes(member.id) && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">$</span>
                        <Input 
                          className="h-8 w-20 text-right text-xs" 
                          type="number" 
                          step="0.01" 
                          value={customAmounts[member.id] || ''} 
                          onChange={(e) => setCustomAmounts({...customAmounts, [member.id]: e.target.value})}
                          disabled={splitType === 'equal'}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}