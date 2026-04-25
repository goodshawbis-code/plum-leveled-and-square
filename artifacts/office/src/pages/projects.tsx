import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, ArrowRight, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">Projects</h1>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </>
        ) : (
          projects?.map((project) => (
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
                <div className="flex justify-between items-center pt-4 border-t">
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1 w-full justify-between">
                      View Project <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {(!isLoading && (!projects || projects.length === 0)) && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No projects found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
