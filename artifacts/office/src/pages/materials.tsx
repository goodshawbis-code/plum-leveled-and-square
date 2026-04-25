import { useRef, useState } from "react";
import { useListMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial, getListMaterialsQueryKey } from "@workspace/api-client-react";
import type { Material } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, PackageSearch, Camera, X, ImageOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const materialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  spec: z.string().min(1, "Specification is required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

function resolveUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url;
}

function MaterialPhotoUploader({
  material,
  onDone,
}: {
  material: Material | null;
  onDone: (updated: Material) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const pictureUrl = material?.pictureUrl ? resolveUrl(material.pictureUrl) : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !material) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`/api/materials/${material.id}/photo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const updated: Material = await res.json();
      onDone(updated);
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!material) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/materials/${material.id}/photo`, { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      const updated: Material = await res.json();
      onDone(updated);
      toast({ title: "Photo removed" });
    } catch {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  if (!material) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Material Photo</div>
      {pictureUrl ? (
        <div className="relative w-full h-40 rounded-md overflow-hidden border bg-muted/20 group">
          <img
            src={pictureUrl}
            alt="Material"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-1" />
              Replace
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
          {(uploading || removing) && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-sm font-medium">
              {uploading ? "Uploading…" : "Removing…"}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border border-dashed rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-sm">Uploading…</span>
          ) : (
            <>
              <Camera className="h-6 w-6" />
              <span className="text-sm">Click to add a photo</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default function Materials() {
  const { data: materials, isLoading } = useListMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      type: "",
      spec: "",
      description: "",
      unit: "LF",
    },
  });

  const onSubmit = (data: MaterialFormValues) => {
    if (editingMaterial) {
      updateMaterial.mutate(
        { id: editingMaterial.id, data },
        {
          onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
            setEditingMaterial(updated);
            setIsDialogOpen(false);
            setEditingMaterial(null);
            toast({ title: "Material updated" });
          },
        }
      );
    } else {
      createMaterial.mutate(
        { data },
        {
          onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
            setEditingMaterial(created);
            toast({ title: "Material created — add a photo below" });
          },
        }
      );
    }
  };

  const openEdit = (material: Material) => {
    setEditingMaterial(material);
    form.reset({
      name: material.name,
      type: material.type,
      spec: material.spec,
      description: material.description || "",
      unit: material.unit,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingMaterial(null);
    form.reset({
      name: "",
      type: "",
      spec: "",
      description: "",
      unit: "LF",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this material?")) {
      deleteMaterial.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
            toast({ title: "Material deleted" });
          },
        }
      );
    }
  };

  const handlePhotoUpdated = (updated: Material) => {
    setEditingMaterial(updated);
    queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">Materials Catalog</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingMaterial(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="button-new-material">
              <Plus className="mr-2 h-4 w-4" />
              New Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMaterial ? "Edit Material" : "Create Material"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 2x4 Lumber" {...field} data-testid="input-material-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type/Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Framing" {...field} data-testid="input-material-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit of Measure</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material-unit">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EA">Each (EA)</SelectItem>
                            <SelectItem value="LF">Linear Feet (LF)</SelectItem>
                            <SelectItem value="SF">Square Feet (SF)</SelectItem>
                            <SelectItem value="SY">Square Yards (SY)</SelectItem>
                            <SelectItem value="CY">Cubic Yards (CY)</SelectItem>
                            <SelectItem value="TN">Tons (TN)</SelectItem>
                            <SelectItem value="HR">Hours (HR)</SelectItem>
                            <SelectItem value="LS">Lump Sum (LS)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="spec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specification / Grade</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. SPF No. 2" {...field} data-testid="input-material-spec" />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional details..." {...field} data-testid="input-material-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMaterial.isPending || updateMaterial.isPending} data-testid="button-save-material">
                  {createMaterial.isPending || updateMaterial.isPending ? "Saving..." : editingMaterial ? "Save Changes" : "Create Material"}
                </Button>
              </form>
            </Form>

            {/* Photo upload section — shown after material exists */}
            {editingMaterial && (
              <div className="pt-4 border-t mt-2">
                <MaterialPhotoUploader
                  material={editingMaterial}
                  onDone={handlePhotoUpdated}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Spec</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.map((material) => (
                  <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                    <TableCell>
                      {material.pictureUrl ? (
                        <img
                          src={resolveUrl(material.pictureUrl)}
                          alt={material.name}
                          className="w-10 h-10 rounded object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>{material.type}</TableCell>
                    <TableCell>{material.spec}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(material)} data-testid={`button-edit-material-${material.id}`}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(material.id)} data-testid={`button-delete-material-${material.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!materials || materials.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No materials found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
