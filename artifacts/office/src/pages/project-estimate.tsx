import { useParams } from "wouter";
import { useGetProject, getGetProjectQueryKey, useGetProjectEstimate, getGetProjectEstimateQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer, FileSpreadsheet, Download } from "lucide-react";
import { Link } from "wouter";

export default function ProjectEstimate() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: estimate, isLoading: isLoadingEstimate } = useGetProjectEstimate(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectEstimateQueryKey(projectId) }
  });

  if (isLoadingProject || isLoadingEstimate) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project || !estimate) {
    return <div>Project or Estimate not found.</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Final Estimate</h1>
            <p className="text-muted-foreground">{project.name} - {project.address}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider">Project Grand Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-primary" data-testid="text-grand-total">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(estimate.totalCost)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Generated on {new Date(estimate.generatedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Line Items</span>
              <span className="font-medium">{estimate.lineItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{project.status}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Line Items
          </CardTitle>
          <CardDescription>Detailed breakdown of all materials and selected bids.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Spec</TableHead>
                <TableHead>Selected Vendor</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.lineItems.map((item, i) => (
                <TableRow key={i} data-testid={`row-estimate-item-${i}`}>
                  <TableCell className="font-medium">
                    <Link href={`/projects/${projectId}/segments/${item.segmentId}`} className="hover:underline text-primary">
                      {item.segmentLabel}
                    </Link>
                  </TableCell>
                  <TableCell>{item.materialName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.materialSpec}</TableCell>
                  <TableCell>{item.vendorName}</TableCell>
                  <TableCell className="text-right">
                    {item.quantity} <span className="text-muted-foreground text-xs">{item.unit}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
              {estimate.lineItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No estimate data available. Ensure segments have materials and selected bids.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
