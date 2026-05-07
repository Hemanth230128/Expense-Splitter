"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2, Search, Mail } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface AddMemberDialogProps {
  groupId: string;
  groupName: string;
  currentMembers: any;
}

export function AddMemberDialog({ groupId, groupName, currentMembers }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !db) return;

    setLoading(true);
    try {
      // 1. Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      
      const querySnapshot = await getDocs(q).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'users',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
      });

      if (querySnapshot.empty) {
        throw new Error('User not found. They must sign up for SplitWisePro first.');
      }

      const foundUser = querySnapshot.docs[0].data();
      const userId = foundUser.id;

      if (currentMembers[userId]) {
        throw new Error('User is already a member of this group.');
      }

      // 2. Update Group document's members map
      const groupRef = doc(db, 'groups', groupId);
      const updatedMembers = {
        ...currentMembers,
        [userId]: 'member'
      };

      updateDoc(groupRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      }).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: groupRef.path,
          operation: 'update',
          requestResourceData: { members: updatedMembers }
        }));
      });

      // 3. Create membership document in subcollection
      const memberRef = doc(db, 'groups', groupId, 'members', userId);
      const memberData = {
        id: userId,
        groupId,
        userId: userId,
        nickname: foundUser.displayName || email.split('@')[0],
        joinedAt: serverTimestamp(),
        groupMembers: updatedMembers
      };

      setDoc(memberRef, memberData).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: memberRef.path,
          operation: 'create',
          requestResourceData: memberData
        }));
      });

      toast({ 
        title: "Member Added!", 
        description: `${foundUser.displayName} has joined ${groupName}.` 
      });
      setOpen(false);
      setEmail('');
    } catch (error: any) {
      // Only toast non-permission errors as those are handled by the emitter
      if (!error.message?.includes('permissions')) {
        toast({ 
          variant: 'destructive', 
          title: 'Action Failed', 
          description: error.message 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
          <UserPlus className="h-4 w-4" /> Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <UserPlus className="text-primary" /> Invite Member
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddMember} className="space-y-6 py-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the email address of the person you want to add to <strong>{groupName}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="member-email">User Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="member-email" 
                  type="email"
                  placeholder="friend@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="pl-10 bg-white/5 border-white/10 focus:border-primary/50"
                  required 
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="subtle-hover">Cancel</Button>
            <Button type="submit" disabled={loading || !email} className="subtle-hover">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Add to Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}