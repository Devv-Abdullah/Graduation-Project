import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMyProfile, useUpdateMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { User as UserIcon, Book, Star, FileText, GraduationCap } from "lucide-react";

const profileSchema = z.object({
  gpa: z.coerce.number().min(0).max(4.2).optional().nullable(),
  skills: z.string().optional().nullable(),
  interests: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      enabled: user?.role === 'student',
    }
  });
  const updateProfile = useUpdateMyProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gpa: null,
      skills: "",
      interests: "",
      description: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        gpa: profile.gpa,
        skills: profile.skills || "",
        interests: profile.interests || "",
        description: profile.description || "",
      });
    }
  }, [profile, form]);

  if (!user) return null;

  if (user.role !== 'student') {
    return (
      <AppLayout title="Profile">
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{user.name}</h3>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                  {user.role}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              Detailed profiles are currently only available for student accounts.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      toast({
        title: "Profile updated",
        description: "Your student profile has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout title="Student Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex shrink-0 items-center justify-center text-primary text-3xl font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground flex items-center gap-2">
                  <UserIcon className="h-4 w-4" /> {user.email}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400">
                    Student
                  </span>
                  {profile?.gpa && (
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-400">
                      GPA: {profile.gpa}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-24 w-full" /></div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Academic Details</CardTitle>
              <CardDescription>
                Help supervisors and potential teammates learn more about your background.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="gpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            GPA
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              max="4.2" 
                              placeholder="3.8" 
                              {...field} 
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-muted-foreground" />
                            Key Skills
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="React, Python, Machine Learning..." {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Book className="h-4 w-4 text-muted-foreground" />
                          Research Interests
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Computer Vision, Distributed Systems..." {...field} value={field.value || ''} />
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
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          About Me
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of your background and what you're looking for in a graduation project..." 
                            className="min-h-30"
                            {...field}
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}