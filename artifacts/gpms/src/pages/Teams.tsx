import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { useListTeams, useCreateTeam, getListTeamsQueryKey, TeamStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const createTeamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  projectTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

type CreateTeamValues = z.infer<typeof createTeamSchema>;

export default function Teams() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teams, isLoading } = useListTeams({
    search: search || undefined,
  }, {
    query: {
      queryKey: getListTeamsQueryKey({ search: search || undefined }),
    }
  });

  const createTeam = useCreateTeam();
  const form = useForm<CreateTeamValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      projectTitle: "",
      description: "",
    },
  });

  const onSubmit = async (data: CreateTeamValues) => {
    try {
      await createTeam.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Team Created",
        description: "Your team has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create team.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TeamStatus.forming:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Forming</Badge>;
      case TeamStatus.active:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Active</Badge>;
      case TeamStatus.supervised:
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Supervised</Badge>;
      case TeamStatus.completed:
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Browse Teams">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search teams or projects..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {user?.role === "student" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Create Team</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Team</DialogTitle>
                  <DialogDescription>
                    Create a new team for your graduation project. You will be set as the team leader.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Code Ninjas" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Title (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. AI-powered Grading System" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="What is your project about..." {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createTeam.isPending}>
                        {createTeam.isPending ? "Creating..." : "Create Team"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : !teams || teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-lg border border-dashed">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No teams found</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              {search ? "No teams match your search criteria." : "There are no teams available in the system yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="line-clamp-1">{team.name}</CardTitle>
                    {getStatusBadge(team.status)}
                  </div>
                  <CardDescription className="line-clamp-1 font-medium text-foreground">
                    {team.projectTitle || "No project title"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {team.description || "No description provided."}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{team.memberCount} members</span>
                    </div>
                    {team.supervisorId && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span className="truncate max-w-[120px]">{team.supervisor?.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`/teams/${team.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}