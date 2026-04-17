import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { 
  useListSupervisorRequests, 
  useSendSupervisorRequest, 
  useAcceptSupervisorRequest, 
  useRejectSupervisorRequest,
  getListSupervisorRequestsQueryKey,
  SupervisorRequestStatus,
  useGetMyTeam,
  getGetMyTeamQueryKey,
  useListUsers,
  getListUsersQueryKey,
  ListUsersRole
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Check, X, Clock, UserPlus } from "lucide-react";
import { format } from "date-fns";

const requestSchema = z.object({
  supervisorId: z.string().min(1, "Please select a supervisor"),
  message: z.string().optional(),
});

export default function SupervisorRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: requests, isLoading: requestsLoading } = useListSupervisorRequests({
    query: {
      queryKey: getListSupervisorRequestsQueryKey(),
    }
  });

  const { data: myTeam } = useGetMyTeam({
    query: {
      queryKey: getGetMyTeamQueryKey(),
      enabled: user?.role === 'student',
      retry: false
    }
  });

  const { data: supervisors } = useListUsers(
    { role: ListUsersRole.supervisor },
    {
      query: {
        queryKey: getListUsersQueryKey({ role: ListUsersRole.supervisor }),
        enabled: user?.role === 'student',
      }
    }
  );

  const sendRequest = useSendSupervisorRequest();
  const acceptRequest = useAcceptSupervisorRequest();
  const rejectRequest = useRejectSupervisorRequest();

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      supervisorId: "",
      message: "",
    },
  });

  const onSubmitRequest = async (data: z.infer<typeof requestSchema>) => {
    try {
      await sendRequest.mutateAsync({ 
        data: {
          supervisorId: parseInt(data.supervisorId, 10),
          message: data.message
        }
      });
      queryClient.invalidateQueries({ queryKey: getListSupervisorRequestsQueryKey() });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Request Sent",
        description: "Your supervision request has been sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send request.",
        variant: "destructive",
      });
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptRequest.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSupervisorRequestsQueryKey() });
      toast({ title: "Request Accepted", description: "You are now supervising this team." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectRequest.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSupervisorRequestsQueryKey() });
      toast({ title: "Request Rejected", description: "You have declined the request." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (user?.role === 'coordinator') {
    return (
      <AppLayout title="Supervisor Requests">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-lg border border-dashed mt-8">
          <h2 className="text-2xl font-bold tracking-tight">Not Applicable</h2>
          <p className="text-muted-foreground mt-2">Coordinators manage assignments from the Coordinator panel.</p>
        </div>
      </AppLayout>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === SupervisorRequestStatus.pending) || [];
  const pastRequests = requests?.filter(r => r.status !== SupervisorRequestStatus.pending) || [];

  return (
    <AppLayout title="Supervisor Requests">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Supervisor Requests</h2>
            <p className="text-muted-foreground">Manage your supervision requests.</p>
          </div>
          {user?.role === 'student' && myTeam && myTeam.leaderId === user.id && !myTeam.supervisorId && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><UserPlus className="h-4 w-4" /> Request Supervisor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Supervision Request</DialogTitle>
                  <DialogDescription>
                    Ask a faculty member to supervise your team. You can only have one pending request at a time.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitRequest)} className="space-y-4">
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
                              {supervisors?.map(sup => (
                                <SelectItem key={sup.id} value={sup.id.toString()}>{sup.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Introduce your project briefly..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={sendRequest.isPending}>
                        {sendRequest.isPending ? "Sending..." : "Send Request"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {requestsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pending</h3>
              {pendingRequests.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No pending requests.
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map(request => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Pending</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(request.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          {user?.role === 'supervisor' ? (
                            <>
                              <h4 className="font-bold text-lg">{request.team.name}</h4>
                              <p className="text-sm font-medium">{request.team.projectTitle}</p>
                            </>
                          ) : (
                            <h4 className="font-bold text-lg">To: {request.supervisor.name}</h4>
                          )}
                          {request.message && (
                            <div className="mt-3 p-3 bg-muted rounded-md text-sm italic">
                              "{request.message}"
                            </div>
                          )}
                        </div>
                        {user?.role === 'supervisor' && (
                          <div className="flex flex-col gap-2 min-w-[120px]">
                            <Button onClick={() => handleAccept(request.id)} disabled={acceptRequest.isPending} size="sm">
                              <Check className="h-4 w-4 mr-2" /> Accept
                            </Button>
                            <Button variant="outline" onClick={() => handleReject(request.id)} disabled={rejectRequest.isPending} size="sm">
                              <X className="h-4 w-4 mr-2" /> Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {pastRequests.length > 0 && (
              <div className="space-y-4 mt-8">
                <h3 className="text-lg font-medium">History</h3>
                {pastRequests.map(request => (
                  <Card key={request.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">
                          {user?.role === 'supervisor' ? request.team.name : `To: ${request.supervisor.name}`}
                        </h4>
                        <span className="text-xs text-muted-foreground">{format(new Date(request.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <Badge variant={request.status === SupervisorRequestStatus.accepted ? "default" : "destructive"} className="capitalize">
                        {request.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}