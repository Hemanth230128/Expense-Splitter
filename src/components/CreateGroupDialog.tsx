"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Loader2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !user || !db) return;

    setLoading(true);
    const groupId = doc(collection(db, 'groups')).id;
    const groupRef = doc(db, 'groups', groupId);

    const groupData = {
      id: groupId,
      name,
      description,
      creatorId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      members: {
        [user.uid]: 'admin'
      }
    };

    try {
      // 1. Create parent group doc
      await setDoc(groupRef, groupData);
      
      // 2. Create membership doc in subcollection
      const memberRef = doc(db, 'groups', groupId, 'members', user.uid);
      await setDoc(memberRef, {
        id: user.uid,
        groupId,
        userId: user.uid,
        joinedAt: serverTimestamp(),
        groupMembers: { [user.uid]: 'admin' } // Denormalized for rules
      });

      toast({ title: "Group Created!", description: `"${name}" is ready for expenses.` });
      setOpen(false);
      setName('');
      setDescription('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="border-dashed border-2 border-white/10 rounded-lg bg-card/20 flex flex-col items-center justify-center p-8 text-center subtle-hover cursor-pointer hover:border-primary/50 group h-full min-h-[220px]">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <Plus className="h-8 w-8 text-primary/60 group-hover:text-primary transition-colors" />
          </div>
          <h3 className="text-xl font-bold mb-2">New Group</h3>
          <p className="text-sm text-muted-foreground mb-6">Split bills with friends or family.</p>
          <Button className="w-full subtle-hover">Create Group</Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <Users className="text-primary" /> Create Expense Group
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Vacation Crew, Housemates" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="bg-white/5 border-white/10 focus:border-primary/50"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description (Optional)</Label>
            <Textarea 
              id="desc" 
              placeholder="What's this group for?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="subtle-hover">Cancel</Button>
            <Button type="submit" disabled={loading || !name} className="subtle-hover">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}