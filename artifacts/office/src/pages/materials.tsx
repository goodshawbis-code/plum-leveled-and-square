import { useState } from "react";
import { useListMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial, getListMaterialsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, PackageSearch } from "lucide-react";
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

export default function Materials() {
  const { data: materials, isLoading } = useListMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);

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
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
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
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Material created" });
          },
        }
      );
    }
  };

  const openEdit = (material: any) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">Materials Catalog</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="button-new-material">
              <Plus className="mr-2 h-4 w-4" />
              New Material
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  {createMaterial.isPending || updateMaterial.isPending ? "Saving..." : "Save Material"}
                </Button>
              </form>
            </Form>
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
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
