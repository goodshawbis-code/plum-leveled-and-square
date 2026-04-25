import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetSegment, 
  getGetSegmentQueryKey,
  useListBids, 
  useCreateBid, 
  useUpdateBid, 
  useDeleteBid, 
  useListMaterials, 
  useListVendors,
  useListSegmentPhotos,
  getListBidsQueryKey,
  useGetProject,
  getGetProjectQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Circle, Plus, Trash2, Tag, Building2, PackageSearch, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";

const bidSchema = z.object({
  materialId: z.string().min(1, "Material is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  unitPrice: z.number().min(0, "Price must be positive"),
  quantity: z.number().min(1, "Quantity must be positive"),
  notes: z.string().optional(),
});

type BidFormValues = z.infer<typeof bidSchema>;

export default function SegmentDetail() {
  const { id, segId } = useParams<{ id: string; segId: string }>();
  const projectId = Number(id);
  const segmentId = Number(segId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });
  const { data: segment, isLoading: isLoadingSegment } = useGetSegment(segmentId, { query: { enabled: !!segmentId, queryKey: getGetSegmentQueryKey(segmentId) } });
  const { data: bids, isLoading: isLoadingBids } = useListBids(segmentId, { query: { enabled: !!segmentId, queryKey: getListBidsQueryKey(segmentId) } });
  
  const { data: materials } = useListMaterials();
  const { data: vendors } = useListVendors();
  const { data: photos = [] } = useListSegmentPhotos(segmentId, { query: { enabled: !!segmentId } });

  const createBid = useCreateBid();
  const updateBid = useUpdateBid();
  const deleteBid = useDeleteBid();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      materialId: "",
      vendorId: "",
      unitPrice: 0,
      quantity: 1,
      notes: "",
    },
  });

  const onSubmit = (data: BidFormValues) => {
    createBid.mutate(
      {
        segmentId,
        data: {
          materialId: Number(data.materialId),
          vendorId: Number(data.vendorId),
          unitPrice: data.unitPrice,
          quantity: data.quantity,
          notes: data.notes,
          isSelected: false, // New bids are not selected by default
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBidsQueryKey(segmentId) });
          setIsDialogOpen(false);
          form.reset();
          toast({ title: "Bid added successfully" });
        }
      }
    );
  };

  const handleSelectBid = (bidId: number) => {
    const currentBids = bids ?? [];
    const toDeselect = currentBids.filter((b) => b.isSelected && b.id !== bidId);

    const deselections = toDeselect.map(
      (b) =>
        new Promise<void>((resolve, reject) => {
          updateBid.mutate(
            { id: b.id, data: { isSelected: false } },
            { onSuccess: () => resolve(), onError: reject }
          );
        })
    );

    Promise.all(deselections).then(() => {
      updateBid.mutate(
        { id: bidId, data: { isSelected: true } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBidsQueryKey(segmentId) });
            toast({ title: "Bid selected for estimate" });
          }
        }
      );
    });
  };

  const handleDeleteBid = (bidId: number) => {
    if (!confirm("Are you sure you want to delete this bid?")) return;
    deleteBid.mutate(
      { id: bidId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBidsQueryKey(segmentId) });
          toast({ title: "Bid deleted" });
        }
      }
    );
  };

  if (isLoadingSegment || isLoadingBids) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!segment) return <div>Segment not found.</div>;

  // Group bids by material for comparison
  const bidsByMaterial = bids?.reduce((acc, bid) => {
    const matId = bid.materialId;
    if (!acc[matId]) acc[matId] = [];
    acc[matId].push(bid);
    return acc;
  }, {} as Record<number, typeof bids>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight text-primary">{segment.label}</h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-1">
              <Building2 className="h-4 w-4" /> {project?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-bid">
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor Bid
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Vendor Bid</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="materialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materials?.map(m => (
                              <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.spec})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vendor">
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendors?.map(v => (
                              <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} data-testid="input-bid-quantity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} data-testid="input-bid-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Vendor conditions, lead time, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createBid.isPending} data-testid="button-save-bid">
                    {createBid.isPending ? "Saving..." : "Save Bid"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Segment Details
                {segment.completedAt ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Pending
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="font-medium capitalize">{segment.type}</div>
              </div>
              {segment.description && (
                <div>
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="text-sm mt-1">{segment.description}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground">Dimensions (Relative)</div>
                <div className="text-sm mt-1 font-mono">
                  W: {segment.width.toFixed(1)}% &times; H: {segment.height.toFixed(1)}%
                </div>
              </div>
              {segment.completedAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <div className="text-sm mt-1 font-medium text-green-700">
                    {new Date(segment.completedAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field Notes from crew */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Field Notes</CardTitle>
              <CardDescription>Notes submitted by the field crew</CardDescription>
            </CardHeader>
            <CardContent>
              {segment.fieldNotes ? (
                <p className="text-sm whitespace-pre-wrap">{segment.fieldNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No field notes yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Field Photos */}
          {photos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Field Photos</CardTitle>
                <CardDescription>{photos.length} photo{photos.length !== 1 ? "s" : ""} from the field</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo) => {
                    const src = photo.fileUrl.startsWith("http")
                      ? photo.fileUrl
                      : photo.fileUrl.startsWith("/storage/")
                        ? `/api${photo.fileUrl}`
                        : photo.fileUrl;
                    return (
                      <div key={photo.id} className="rounded overflow-hidden border aspect-square bg-muted">
                        <img
                          src={src}
                          alt={photo.caption ?? "Field photo"}
                          className="w-full h-full object-cover"
                        />
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground px-1 pb-1 truncate">{photo.caption}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          {Object.entries(bidsByMaterial).map(([materialIdStr, materialBids]) => {
            const material = materials?.find(m => m.id.toString() === materialIdStr);
            if (!material) return null;

            return (
              <Card key={materialIdStr}>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <PackageSearch className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{material.name}</CardTitle>
                    <span className="text-sm text-muted-foreground ml-2">({material.spec})</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">Select</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialBids.map(bid => {
                        const vendor = vendors?.find(v => v.id === bid.vendorId);
                        const total = bid.quantity * bid.unitPrice;
                        return (
                          <TableRow key={bid.id} className={bid.isSelected ? "bg-primary/5" : ""} data-testid={`row-bid-${bid.id}`}>
                            <TableCell className="text-center">
                              <button 
                                onClick={() => handleSelectBid(bid.id)}
                                className={`rounded-full flex items-center justify-center transition-colors ${bid.isSelected ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                data-testid={`radio-bid-${bid.id}`}
                              >
                                {bid.isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                              </button>
                            </TableCell>
                            <TableCell className="font-medium">{vendor?.name || `Vendor #${bid.vendorId}`}</TableCell>
                            <TableCell className="text-right">
                              {bid.quantity} <span className="text-muted-foreground text-xs">{material.unit}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(bid.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary font-mono">
                              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteBid(bid.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(bidsByMaterial).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                <Calculator className="h-10 w-10 mb-4 opacity-20" />
                <p>No bids have been added for this segment yet.</p>
                <p>Add vendor bids to start comparing prices.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
