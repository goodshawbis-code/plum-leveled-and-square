import { useState, useRef, useEffect } from "react";
import { 
  useGetProject, 
  getGetProjectQueryKey,
  useListBlueprints, 
  useCreateBlueprint, 
  useDeleteBlueprint,
  getListBlueprintsQueryKey,
  useListSegments,
  useCreateSegment,
  getListSegmentsQueryKey
} from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileImage, Image as ImageIcon, Calculator, ArrowLeft, Maximize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const segmentSchema = z.object({
  label: z.string().min(1, "Label is required"),
  type: z.enum(["wall", "grid", "elevation", "detail"]),
  description: z.string().optional(),
});

type SegmentFormValues = z.infer<typeof segmentSchema>;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });
  
  const { data: blueprints, isLoading: isLoadingBlueprints } = useListBlueprints(projectId, {
    query: { enabled: !!projectId, queryKey: getListBlueprintsQueryKey(projectId) }
  });

  const createBlueprint = useCreateBlueprint();
  const deleteBlueprint = useDeleteBlueprint();

  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Automatically select the first blueprint if none is selected
  useEffect(() => {
    if (blueprints && blueprints.length > 0 && !selectedBlueprintId) {
      setSelectedBlueprintId(blueprints[0].id);
    }
  }, [blueprints, selectedBlueprintId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pageCount", "1");

    createBlueprint.mutate(
      { projectId, data: formData as any },
      {
        onSuccess: (newBp) => {
          queryClient.invalidateQueries({ queryKey: getListBlueprintsQueryKey(projectId) });
          setSelectedBlueprintId(newBp.id);
          toast({ title: "Blueprint uploaded successfully" });
          setIsUploading(false);
        },
        onError: () => {
          toast({ title: "Failed to upload blueprint", variant: "destructive" });
          setIsUploading(false);
        }
      }
    );
  };

  const handleDeleteBlueprint = (bpId: number) => {
    if (!confirm("Are you sure you want to delete this blueprint?")) return;
    
    deleteBlueprint.mutate(
      { id: bpId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBlueprintsQueryKey(projectId) });
          if (selectedBlueprintId === bpId) {
            setSelectedBlueprintId(null);
          }
          toast({ title: "Blueprint deleted" });
        }
      }
    );
  };

  if (isLoadingProject || isLoadingBlueprints) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 md:col-span-3" />
        </div>
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  const selectedBlueprint = blueprints?.find(b => b.id === selectedBlueprintId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">{project.name}</h1>
            <p className="text-muted-foreground">{project.address}</p>
          </div>
        </div>
        <Button onClick={() => setLocation(`/projects/${projectId}/estimate`)} data-testid="button-view-estimate">
          <Calculator className="mr-2 h-4 w-4" />
          View Estimate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar: Blueprint List */}
        <Card className="md:col-span-1 h-[calc(100vh-12rem)] flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Blueprints</CardTitle>
            <CardDescription>Upload and select blueprints</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-4">
            <div className="space-y-2">
              {blueprints?.map(bp => (
                <div 
                  key={bp.id} 
                  className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${selectedBlueprintId === bp.id ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted'}`}
                  onClick={() => setSelectedBlueprintId(bp.id)}
                  data-testid={`card-blueprint-${bp.id}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileImage className={`h-5 w-5 shrink-0 ${selectedBlueprintId === bp.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate font-medium text-sm" title={bp.fileName}>{bp.fileName}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDeleteBlueprint(bp.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!blueprints || blueprints.length === 0) && (
                <div className="text-center p-4 border border-dashed rounded-md text-sm text-muted-foreground">
                  No blueprints uploaded yet.
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <Label htmlFor="blueprint-upload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-muted transition-colors text-sm font-medium">
                  {isUploading ? "Uploading..." : <><Plus className="h-4 w-4" /> Upload Blueprint</>}
                </div>
                <Input 
                  id="blueprint-upload" 
                  type="file" 
                  accept="image/*,.pdf" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  data-testid="input-upload-blueprint"
                />
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Main Area: Blueprint Viewer */}
        <Card className="md:col-span-3 h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
          {selectedBlueprint ? (
            <BlueprintViewer blueprint={selectedBlueprint} projectId={projectId} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
              <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
              <p>Select a blueprint to view or upload a new one.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function BlueprintViewer({ blueprint, projectId }: { blueprint: any, projectId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: segments } = useListSegments(blueprint.id, {
    query: { enabled: !!blueprint.id, queryKey: getListSegmentsQueryKey(blueprint.id) }
  });
  const createSegment = useCreateSegment();

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentSchema),
    defaultValues: { label: "", type: "wall", description: "" },
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click
    if (e.button !== 0) return;
    if (!containerRef.current || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    // Ensure we clicked inside the image
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom
    ) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentRect({ x, y, w: 0, h: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentRect || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    let currentX = ((e.clientX - rect.left) / rect.width) * 100;
    let currentY = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp to 0-100
    currentX = Math.max(0, Math.min(100, currentX));
    currentY = Math.max(0, Math.min(100, currentY));

    const newX = Math.min(startPos.x, currentX);
    const newY = Math.min(startPos.y, currentY);
    const newW = Math.abs(currentX - startPos.x);
    const newH = Math.abs(currentY - startPos.y);

    setCurrentRect({ x: newX, y: newY, w: newW, h: newH });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing || !currentRect) return;
    setIsDrawing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Only trigger if dragged a bit
    if (currentRect.w > 1 && currentRect.h > 1) {
      form.reset({ label: "", type: "wall", description: "" });
      setIsDialogOpen(true);
    } else {
      setCurrentRect(null);
    }
  };

  const onSubmit = (data: SegmentFormValues) => {
    if (!currentRect) return;

    createSegment.mutate(
      {
        blueprintId: blueprint.id,
        data: {
          ...data,
          x: currentRect.x,
          y: currentRect.y,
          width: currentRect.w,
          height: currentRect.h,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSegmentsQueryKey(blueprint.id) });
          setIsDialogOpen(false);
          setCurrentRect(null);
          toast({ title: "Segment created" });
        }
      }
    );
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case "wall": return "bg-blue-500/30 border-blue-500";
      case "grid": return "bg-green-500/30 border-green-500";
      case "elevation": return "bg-amber-500/30 border-amber-500";
      case "detail": return "bg-purple-500/30 border-purple-500";
      default: return "bg-gray-500/30 border-gray-500";
    }
  };

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between py-3 border-b shrink-0">
        <CardTitle className="text-lg font-medium truncate" title={blueprint.fileName}>
          {blueprint.fileName}
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Maximize className="h-3 w-3"/> Click & drag to tag segments</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-auto bg-muted/20 relative" ref={containerRef}>
        <div 
          className="relative inline-block min-w-full min-h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            ref={imgRef}
            src={blueprint.fileUrl} 
            alt={blueprint.fileName}
            className="block max-w-none shadow-sm"
            style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
            draggable={false}
          />
          
          {/* Existing Segments */}
          {segments?.map(seg => (
            <div
              key={seg.id}
              className={`absolute border-2 cursor-pointer transition-colors hover:brightness-110 ${getColorForType(seg.type)}`}
              style={{
                left: `${seg.x}%`,
                top: `${seg.y}%`,
                width: `${seg.width}%`,
                height: `${seg.height}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/projects/${projectId}/segments/${seg.id}`);
              }}
              title={seg.label}
              data-testid={`segment-${seg.id}`}
            >
              <div className="absolute -top-6 left-0 bg-background/90 text-foreground text-xs px-1.5 py-0.5 rounded shadow-sm border whitespace-nowrap pointer-events-none">
                {seg.label}
              </div>
            </div>
          ))}

          {/* Current Drawing Rect */}
          {currentRect && isDrawing && (
            <div
              className="absolute border-2 border-primary border-dashed bg-primary/20 pointer-events-none"
              style={{
                left: `${currentRect.x}%`,
                top: `${currentRect.y}%`,
                width: `${currentRect.w}%`,
                height: `${currentRect.h}%`,
              }}
            />
          )}
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setCurrentRect(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define Segment</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. North Wall, Grid A" {...field} autoFocus data-testid="input-segment-label" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-segment-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="wall">Wall</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="elevation">Elevation</SelectItem>
                        <SelectItem value="detail">Detail</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Textarea placeholder="Notes about this region..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={createSegment.isPending} data-testid="button-save-segment">
                {createSegment.isPending ? "Saving..." : "Save Segment"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
