import { useGetDashboard, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Building2, HardHat, FileSpreadsheet, ArrowRight, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL;

const FOUNDING_MEMBERS = [
  {
    name: "C-911 Concrete, LLC",
    logo: `${BASE}c911-concrete.png`,
    description: "Commercial & residential concrete contractor",
  },
  {
    name: "Brick Outdoor Living, Inc.",
    logo: `${BASE}brick-outdoor.jpeg`,
    description: "Outdoor masonry, patios & living spaces",
  },
];

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: projects, isLoading: isLoadingProjects } = useListProjects();

  const estimateByProjectId = new Map(
    (dashboard?.recentProjects ?? []).map((p) => [p.id, p.estimatedTotal])
  );

  if (isLoading || isLoadingProjects) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
        <Link href="/projects/new">
          <Button data-testid="button-new-project">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-projects">{dashboard?.totalProjects ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-projects">{dashboard?.activeProjects ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-value">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(dashboard?.totalEstimatedValue ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-4">All Projects</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Card key={project.id} data-testid={`card-project-${project.id}`}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="line-clamp-1" title={project.name}>{project.name}</span>
                <span className="text-xs font-normal px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
                  {project.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4 line-clamp-1" title={project.address ?? undefined}>
                {project.address || "No address provided"}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold text-primary">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(estimateByProjectId.get(project.id) ?? 0)}
                </span>
                <Link href={`/projects/${project.id}`}>
                  <Button variant="ghost" size="sm" className="gap-1" data-testid={`btn-view-project-${project.id}`}>
                    View <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!projects || projects.length === 0) && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No projects found. Create one to get started.
          </div>
        )}
      </div>

      <div className="mt-12">
        <div className="flex items-center gap-2 mb-5">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h2 className="text-lg font-semibold tracking-tight">Founding Members</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          {FOUNDING_MEMBERS.map((member) => (
            <Card key={member.name} className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="h-16 flex items-center">
                  <img
                    src={member.logo}
                    alt={member.name}
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{member.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Founding Member · Lifetime Access
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
