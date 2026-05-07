"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Users, TrendingUp, ChevronRight, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { CreateGroupDialog } from '@/components/CreateGroupDialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const groupsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'groups'),
      where(`members.${user.uid}`, 'in', ['admin', 'member'])
    );
  }, [db, user?.uid]);

  const { data: groups, isLoading: isGroupsLoading } = useCollection(groupsQuery);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">
              Welcome back, <span className="text-primary">{user.displayName?.split(' ')[0]}</span>!
            </h1>
            <p className="text-muted-foreground">Manage your shared expenses with ease.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-card/40 border p-4 rounded-2xl backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dashboard</span>
              <span className="text-2xl font-headline font-bold text-primary">
                {groups?.length || 0} Active Groups
              </span>
            </div>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CreateGroupDialog />

          {isGroupsLoading ? (
            <div className="col-span-full flex items-center justify-center p-20">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : groups?.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-card/20 rounded-2xl border border-dashed">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-bold">No groups found</h3>
              <p className="text-muted-foreground">Create your first group to start splitting expenses.</p>
            </div>
          ) : (
            groups?.map(group => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="h-full glass-card subtle-hover group overflow-hidden border-white/5 hover:border-primary/20">
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
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                      {group.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-xs font-bold uppercase tracking-widest text-primary/80">
                        {Object.keys(group.members || {}).length} Members
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {group.createdAt ? `Created ${new Date(group.createdAt?.seconds * 1000).toLocaleDateString()}` : 'New Group'}
                      </div>
                    </div>
                  </CardContent>
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Card>
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  );
}