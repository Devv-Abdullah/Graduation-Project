import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { 
  useListProfiles,
  getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, User, Star, GraduationCap, Book } from "lucide-react";
import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export default function Students() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [skills, setSkills] = useState("");
  const [minGpa, setMinGpa] = useState<string>("");

  const debouncedSearch = useDebounce(search.trim(), 300);
  const debouncedSkills = useDebounce(skills.trim(), 300);
  const parsedMinGpa = minGpa.trim() ? Number(minGpa) : undefined;
  const minGpaFilter = Number.isFinite(parsedMinGpa) ? parsedMinGpa : undefined;

  const { data: profiles, isLoading } = useListProfiles(
    { 
      search: debouncedSearch || undefined,
      skills: debouncedSkills || undefined,
      minGpa: minGpaFilter,
    },
    {
      query: {
        queryKey: getListProfilesQueryKey({ 
          search: debouncedSearch || undefined,
          skills: debouncedSkills || undefined,
          minGpa: minGpaFilter,
        }),
        enabled: user?.role === 'supervisor' || user?.role === 'coordinator'
      }
    }
  );

  const profilesList = useMemo(() => {
    const rawProfiles = Array.isArray(profiles) ? profiles : [];
    const searchFilter = search.trim().toLowerCase();
    const skillsFilter = skills.trim().toLowerCase();
    const gpaFilter = Number.isFinite(parsedMinGpa) ? parsedMinGpa : undefined;

    return rawProfiles.filter((profile) => {
      const matchesName = !searchFilter || profile.user.name.toLowerCase().includes(searchFilter);
      const matchesSkills = !skillsFilter || (profile.skills ?? "").toLowerCase().includes(skillsFilter);
      const matchesGpa = gpaFilter === undefined || ((profile.gpa ?? -Infinity) >= gpaFilter);
      return matchesName && matchesSkills && matchesGpa;
    });
  }, [profiles, search, skills, parsedMinGpa]);

  const showEmptyState = !isLoading && profilesList.length === 0;

  if (user?.role === 'student') {
    return (
      <AppLayout title="Students">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-lg border border-dashed mt-8">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground max-w-md mt-2 mb-6">
            Only supervisors and coordinators can browse all students.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Browse Students">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Directory</h2>
          <p className="text-muted-foreground">Find students by skills, interests, or academic performance.</p>
        </div>

        <Card className="border-primary/10 shadow-sm">
          <CardContent className="p-4 grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Star className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by skills (e.g. React, ML)..."
                className="pl-8"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
            <div className="relative">
              <GraduationCap className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.1"
                min="0"
                max="4"
                placeholder="Min GPA (e.g. 3.5)"
                className="pl-8"
                value={minGpa}
                onChange={(e) => setMinGpa(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-lg border border-dashed">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No students found</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Try adjusting your filters to find more students.
            </p>
          </div>
        ) : null}

        {!isLoading && !showEmptyState ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profilesList.map(profile => (
              <Card key={profile.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(profile.user.name?.charAt(0) || "U").toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{profile.user.name}</CardTitle>
                        <CardDescription className="text-xs">{profile.user.email}</CardDescription>
                      </div>
                    </div>
                    {profile.gpa && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        GPA: {profile.gpa}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pb-4 text-sm">
                  {profile.skills && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Star className="h-3 w-3" /> Skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {profile.skills.split(',').slice(0, 5).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {skill.trim()}
                          </Badge>
                        ))}
                        {profile.skills.split(',').length > 5 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">...</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {profile.interests && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Book className="h-3 w-3" /> Interests
                      </p>
                      <p className="line-clamp-2 text-muted-foreground text-xs">{profile.interests}</p>
                    </div>
                  )}
                  {profile.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">About</p>
                      <p className="line-clamp-2 text-muted-foreground text-xs italic">"{profile.description}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}