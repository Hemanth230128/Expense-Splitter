"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface ExpenseFormProps {
  group: any;
  members: any[];
  currentUser: any;
}

export function ExpenseForm({ group, members, currentUser }: ExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser?.uid || '');
  const [involvedUsers, setInvolvedUsers] = useState<string[]>(members.map(m => m.userId));
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  useEffect(() => {
    if (splitType === 'equal' && amount && involvedUsers.length > 0) {
      const splitAmount = (parseFloat(amount) / involvedUsers.length).toFixed(2);
      const newCustom: Record<string, string> = {};
      involvedUsers.forEach(id => newCustom[id] = splitAmount);
      setCustomAmounts(newCustom);
    }
  }, [amount, involvedUsers, splitType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || involvedUsers.length === 0 || !db) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
      return;
    }

    const totalAmount = parseFloat(amount);
    const participants = involvedUsers.map(userId => ({
      userId,
      amount: parseFloat(customAmounts[userId] || '0')
    }));

    const totalParticipantsAmount = participants.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalParticipantsAmount - totalAmount) > 0.05) {
      toast({ variant: 'destructive', title: 'Split mismatch', description: 'Participant totals must equal the total expense amount.' });
      return;
    }

    setLoading(true);
    const expenseId = doc(collection(db, 'groups', group.id, 'expenses')).id;
    const expenseRef = doc(db, 'groups', group.id, 'expenses', expenseId);

    const expenseData = {
      id: expenseId,
      groupId: group.id,
      description,
      totalAmount,
      amount: totalAmount, // Compatibility
      paidById: paidBy,
      paidBy: paidBy, // Compatibility
      expenseDate: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      participants,
      groupMembers: group.members
    };

    try {
      await setDoc(expenseRef, expenseData);
      toast({ title: 'Expense added!', description: `Successfully recorded "${description}"` });
      setOpen(false);
      reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDescription('');
    setAmount('');
    setPaidBy(currentUser?.uid || '');
    setInvolvedUsers(members.map(m => m.userId));
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
                    {members.map(member => (
                      <SelectItem key={member.userId} value={member.userId}>{member.nickname}</SelectItem>
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
                {members.map(member => (
                  <div key={member.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`user-${member.userId}`} 
                        checked={involvedUsers.includes(member.userId)} 
                        onCheckedChange={(checked) => {
                          if (checked) setInvolvedUsers([...involvedUsers, member.userId]);
                          else setInvolvedUsers(involvedUsers.filter(id => id !== member.userId));
                        }} 
                      />
                      <Label htmlFor={`user-${member.userId}`} className="text-sm cursor-pointer">{member.nickname}</Label>
                    </div>
                    {involvedUsers.includes(member.userId) && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">$</span>
                        <Input 
                          className="h-8 w-20 text-right text-xs" 
                          type="number" 
                          step="0.01" 
                          value={customAmounts[member.userId] || ''} 
                          onChange={(e) => setCustomAmounts({...customAmounts, [member.userId]: e.target.value})}
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}