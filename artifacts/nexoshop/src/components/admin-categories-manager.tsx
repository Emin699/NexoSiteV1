import { useState } from "react";
import {
  useAdminListCategories,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
  getAdminListCategoriesQueryKey,
  getGetCategoriesQueryKey,
  getAdminGetProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export function AdminCategoriesManager() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useAdminListCategories();
  const createCat = useAdminCreateCategory();
  const updateCat = useAdminUpdateCategory();
  const deleteCat = useAdminDeleteCategory();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const refetch = () => {
    qc.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminGetProductsQueryKey() });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Nom requis");
      return;
    }
    try {
      await createCat.mutateAsync({ data: { name } });
      setNewName("");
      refetch();
      toast.success("Catégorie créée");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
    }
  };

  const startEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id: number) => {
    const name = editName.trim();
    if (!name) {
      toast.error("Nom requis");
      return;
    }
    try {
      await updateCat.mutateAsync({ id, data: { name } });
      cancelEdit();
      refetch();
      toast.success("Catégorie renommée");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    try {
      await deleteCat.mutateAsync({ id });
      refetch();
      toast.success("Catégorie supprimée");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Suppression impossible";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Nouvelle catégorie</h3>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-cat" className="sr-only">
                Nom
              </Label>
              <Input
                id="new-cat"
                placeholder="Ex : Logiciels"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                className="bg-background border-border/60"
              />
            </div>
            <Button onClick={handleCreate} disabled={createCat.isPending}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Renommer ou supprimer met à jour automatiquement la boutique. Une catégorie utilisée par des produits ne peut pas être supprimée.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-muted/20 animate-pulse" />
        ))
      ) : !categories || categories.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          Aucune catégorie pour le moment.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <Card key={c.id} className="bg-card/50 border-border/50">
                <CardContent className="p-3 flex items-center gap-2">
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(c.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 h-8 bg-background border-border/60"
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        slug : <span className="font-mono">{c.slug}</span>
                      </p>
                    </div>
                  )}
                  <div className="flex gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 hover:bg-emerald-500/10 hover:text-emerald-400"
                          onClick={() => saveEdit(c.id)}
                          disabled={updateCat.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 hover:bg-muted"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => startEdit(c.id, c.name)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deleteCat.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
