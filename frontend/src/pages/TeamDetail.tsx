import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { useGetTeam, useGetTeamMembers, getGetTeamQueryKey, getGetTeamMembersQueryKey, useSendInvitation, TeamStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "wouter";
import { Users, Briefcase, Mail, Activity, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

export default function TeamDetail() {
  const { id } = useParams();
  const teamId = parseInt(id || "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: team, isLoading: isLoadingTeam } = useGetTeam(teamId, {
    query: {
      enabled: !!teamId,
      queryKey: getGetTeamQueryKey(teamId),
    }
  });

  const { data: members, isLoading: isLoadingMembers } = useGetTeamMembers(teamId, {
    query: {
      enabled: !!teamId,
      queryKey: getGetTeamMembersQueryKey(teamId),
    }
  });

  const sendInvitation = useSendInvitation();
  const [inviteUserId, setInviteUserId] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isRequestingJoin, setIsRequestingJoin] = useState(false);
  const [hasSentJoinRequest, setHasSentJoinRequest] = useState(false);

  const handleInvite = async () => {
    try {
      const parsedUserId = parseInt(inviteUserId, 10);
      if (isNaN(parsedUserId)) {
        toast({
          title: "Error",
          description: "Please enter a valid user ID.",
          variant: "destructive",
        });
        return;
      }

      await sendInvitation.mutateAsync({
        data: {
          teamId,
          invitedUserId: parsedUserId,
        }
      });
      setIsInviteDialogOpen(false);
      setInviteUserId("");
      toast({
        title: "Invitation Sent",
        description: "The student has been invited to the team.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive",
      });
    }
  };

  const handleJoinRequest = async () => {
    try {
      setIsRequestingJoin(true);
      const response = await fetch(`/api/teams/${teamId}/join-request`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data && typeof data.error === "string" ? data.error : "Failed to send join request.";
        throw new Error(message);
      }

      setHasSentJoinRequest(true);
      toast({
        title: "Request sent",
        description: "Your join request was sent to the team leader.",
      });
      queryClient.invalidateQueries({ queryKey: getGetTeamMembersQueryKey(teamId) });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send join request.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingJoin(false);
    }
  };

  if (isLoadingTeam || isLoadingMembers) {
    return (
      <AppLayout title="Team Details">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!team) {
    return (
      <AppLayout title="Team Details">
        <div className="text-center p-12">
          <h2 className="text-xl font-bold">Team not found</h2>
          <p className="text-muted-foreground mt-2">The team you're looking for doesn't exist or you don't have access.</p>
          <Button asChild className="mt-4">
            <Link href="/teams">Back to Teams</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isLeader = members?.some(m => m.userId === user?.id && m.role === 'leader');
  const isMember = members?.some(m => m.userId === user?.id) ?? false;
  const canRequestJoin = Boolean(user && user.role === "student" && !isMember && !isLeader && team.status !== TeamStatus.completed);

  return (
    <AppLayout title={team.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/teams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Team Profile</h2>
          {canRequestJoin && (
            <Button
              onClick={handleJoinRequest}
              disabled={isRequestingJoin || hasSentJoinRequest}
              className="ml-auto"
            >
              {hasSentJoinRequest ? "Request Sent" : isRequestingJoin ? "Sending..." : "Join Team"}
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{team.name}</CardTitle>
                    <CardDescription className="text-base mt-1 text-foreground font-medium">
                      {team.projectTitle || "No project title set"}
                    </CardDescription>
                  </div>
                  <Badge variant={team.status === TeamStatus.completed ? "default" : "secondary"} className="capitalize text-sm px-3 py-1">
                    {team.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm">{team.description || "No description provided."}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3 flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Phase</p>
                      <p className="text-sm font-medium capitalize">{team.currentPhase || "None"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Supervisor</p>
                      <p className="text-sm font-medium">{team.supervisor?.name || "Unassigned"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>People working on this project</CardDescription>
                </div>
                {isLeader && team.status !== TeamStatus.completed && (
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Mail className="h-4 w-4" /> Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite User</DialogTitle>
                        <DialogDescription>
                          Enter the User ID of the student you want to invite.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="userId">User ID</Label>
                          <Input 
                            id="userId" 
                            type="number"
                            placeholder="e.g. 2" 
                            value={inviteUserId}
                            onChange={(e) => setInviteUserId(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Use the numeric user ID of the student account.
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleInvite} disabled={!inviteUserId || sendInvitation.isPending}>
                          {sendInvitation.isPending ? "Sending..." : "Send Invitation"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {member.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.user.name}</p>
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <Badge variant={member.role === 'leader' ? "default" : "secondary"} className="capitalize">
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                  {(!members || members.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No members found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Team Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Member Count</span>
                  <span className="font-medium">{team.memberCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{new Date(team.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}