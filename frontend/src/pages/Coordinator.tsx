import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { 
  useGetCoordinatorDashboard, 
  getGetCoordinatorDashboardQueryKey,
  useCoordinatorAssignSupervisor,
  useListUsers,
  getListUsersQueryKey,
  ListUsersRole,
  useListActivityLogs,
  getListActivityLogsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Users, Briefcase, Activity, UserPlus, Clock } from "lucide-react";
import { format } from "date-fns";

const assignSchema = z.object({
  supervisorId: z.string().min(1, "Please select a supervisor"),
});

export default function Coordinator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [assigningTeamId, setAssigningTeamId] = useState<number | null>(null);

  const { data: dashboard, isLoading: dashboardLoading } = useGetCoordinatorDashboard({
    query: {
      queryKey: getGetCoordinatorDashboardQueryKey(),
      enabled: user?.role === 'coordinator'
    }
  });

  const { data: supervisors } = useListUsers(
    { role: ListUsersRole.supervisor },
    {
      query: {
        queryKey: getListUsersQueryKey({ role: ListUsersRole.supervisor }),
        enabled: user?.role === 'coordinator'
      }
    }
  );

  const { data: logs, isLoading: logsLoading } = useListActivityLogs({
    query: {
      queryKey: getListActivityLogsQueryKey(),
      enabled: user?.role === 'coordinator'
    }
  });

  const assignSupervisor = useCoordinatorAssignSupervisor();

  const form = useForm<z.infer<typeof assignSchema>>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      supervisorId: "",
    },
  });

  const onAssign = async (data: z.infer<typeof assignSchema>) => {
    if (!assigningTeamId) return;
    try {
      await assignSupervisor.mutateAsync({
        data: {
          teamId: assigningTeamId,
          supervisorId: parseInt(data.supervisorId, 10)
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetCoordinatorDashboardQueryKey() });
      setAssigningTeamId(null);
      form.reset();
      toast({ title: "Supervisor Assigned", description: "The team has been assigned a supervisor." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to assign supervisor.", variant: "destructive" });
    }
  };

  if (user?.role !== 'coordinator') {
    return (
      <AppLayout title="Coordinator Panel">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-lg border border-dashed mt-8">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground max-w-md mt-2 mb-6">
            Only coordinators can access this panel.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Coordinator Panel">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Administration</h2>
          <p className="text-muted-foreground">Manage teams, supervisors, and monitor system activity.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Unassigned Teams
                </CardTitle>
                <CardDescription>Teams waiting for a supervisor assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : !dashboard?.unassignedTeamsList || dashboard.unassignedTeamsList.length === 0 ? (
                  <div className="text-center p-6 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">All active teams have supervisors assigned.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboard.unassignedTeamsList.map(team => (
                      <div key={team.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-lg p-4 gap-4">
                        <div>
                          <h4 className="font-bold text-base">{team.name}</h4>
                          <p className="text-sm text-muted-foreground">{team.projectTitle || 'No project title'}</p>
                          <p className="text-xs mt-1 font-medium">{team.memberCount} members</p>
                        </div>
                        
                        <Dialog open={assigningTeamId === team.id} onOpenChange={(open) => {
                          setAssigningTeamId(open ? team.id : null);
                          if (!open) form.reset();
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="shrink-0 gap-2">
                              <UserPlus className="h-4 w-4" /> Assign
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Supervisor</DialogTitle>
                              <DialogDescription>
                                Select a faculty member to supervise <strong>{team.name}</strong>.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit(onAssign)} className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="supervisorId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Supervisor</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a supervisor" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {supervisors?.map(sup => {
                                            const workload = dashboard.supervisorWorkload.find(w => w.supervisor.id === sup.id);
                                            return (
                                              <SelectItem key={sup.id} value={sup.id.toString()}>
                                                {sup.name} ({workload?.teamCount || 0} teams)
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter>
                                  <Button type="button" variant="outline" onClick={() => setAssigningTeamId(null)}>Cancel</Button>
                                  <Button type="submit" disabled={assignSupervisor.isPending}>
                                    {assignSupervisor.isPending ? "Assigning..." : "Assign"}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> System Activity Log
                </CardTitle>
                <CardDescription>Recent events across all teams and users.</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !logs || logs.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4">No activity logs available.</p>
                ) : (
                  <div className="space-y-4">
                    {logs.slice(0, 20).map(log => (
                      <div key={log.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="mt-0.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.description}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}</span>
                            {log.user && (
                              <span className="text-xs text-muted-foreground">• {log.user.name}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase">{log.action}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Supervisor Workload
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : !dashboard?.supervisorWorkload || dashboard.supervisorWorkload.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">No supervisors available.</p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.supervisorWorkload.map(item => (
                      <div key={item.supervisor.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {item.supervisor.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{item.supervisor.name}</span>
                        </div>
                        <Badge variant={item.teamCount > 3 ? "destructive" : "secondary"}>
                          {item.teamCount} teams
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}