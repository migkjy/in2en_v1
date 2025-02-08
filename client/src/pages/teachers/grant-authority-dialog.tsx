import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Branch, Class } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

type GrantAuthorityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  currentBranches: Branch[];
  currentClasses: Class[];
};

export function GrantAuthorityDialog({
  open,
  onOpenChange,
  teacherId,
  currentBranches,
  currentClasses,
}: GrantAuthorityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBranches, setSelectedBranches] = useState<number[]>(
    currentBranches.map((b) => b.id)
  );
  const [selectedClasses, setSelectedClasses] = useState<number[]>(
    currentClasses.map((c) => c.id)
  );

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch("/api/branches");
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
  });

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const response = await fetch("/api/classes");
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
  });

  useEffect(() => {
    if (open) {
      setSelectedBranches(currentBranches.map((b) => b.id));
      setSelectedClasses(currentClasses.map((c) => c.id));
    }
  }, [open, currentBranches, currentClasses]);

  const updateAuthority = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/teachers/${teacherId}/authority`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchIds: selectedBranches,
          classIds: selectedClasses,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update authority");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers", teacherId] });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers", teacherId, "branches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers", teacherId, "classes"] });
      toast({
        title: "Success",
        description: "Authority updated successfully",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update authority",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grant Authority</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Branches</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecting a branch grants access to all classes within it.
            </p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {branches?.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBranches([...selectedBranches, branch.id]);
                        } else {
                          setSelectedBranches(selectedBranches.filter((id) => id !== branch.id));
                        }
                      }}
                    />
                    <Label htmlFor={`branch-${branch.id}`}>{branch.name}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Individual Classes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select specific classes to grant access to.
            </p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {classes?.map((cls) => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={selectedClasses.includes(cls.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClasses([...selectedClasses, cls.id]);
                        } else {
                          setSelectedClasses(selectedClasses.filter((id) => id !== cls.id));
                        }
                      }}
                    />
                    <Label htmlFor={`class-${cls.id}`}>
                      {cls.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateAuthority.mutate()} disabled={updateAuthority.isPending}>
              {updateAuthority.isPending ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
