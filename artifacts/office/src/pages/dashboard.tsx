import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Building2, HardHat, FileSpreadsheet, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading) {
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

      <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-4">Recent Projects</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboard?.recentProjects?.map((project) => (
          <Card key={project.id} data-testid={`card-project-${project.id}`}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="line-clamp-1" title={project.name}>{project.name}</span>
                <span className="text-xs font-normal px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {project.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4 line-clamp-1" title={project.address}>
                {project.address || "No address provided"}
              </div>
              <div className="flex justify-between text-sm mb-4">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Blueprints</span>
                  <span className="font-medium">{project.blueprintCount}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-muted-foreground">Segments</span>
                  <span className="font-medium">{project.segmentCount}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold text-primary">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(project.estimatedTotal ?? 0)}
                </span>
                <Link href={`/projects/${project.id}`}>
                  <Button variant="ghost" size="sm" className="gap-1">
                    View <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!dashboard?.recentProjects || dashboard.recentProjects.length === 0) && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No projects found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
