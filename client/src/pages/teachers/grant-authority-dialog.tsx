import { useEffect, useState } from "react";
import { Class, Branch } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

type GrantAuthorityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  currentClasses: Class[];
  currentBranches: Branch[];
};

export function GrantAuthorityDialog({
  open,
  onOpenChange,
  teacherId,
  currentClasses,
  currentBranches,
}: GrantAuthorityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClasses, setSelectedClasses] = useState<number[]>(
    currentClasses.map((c) => c.id)
  );
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    queryFn: async () => {
      const response = await fetch("/api/classes");
      if (!response.ok) throw new Error("Failed to fetch classes");
      return response.json();
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch("/api/branches");
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
  });

  useEffect(() => {
    if (open) {
      console.log("Setting initial selections:", {
        classes: currentClasses.map(c => c.id)
      });
      setSelectedClasses(currentClasses.map((c) => c.id));
      setSelectedBranch("all");
    }
  }, [open, currentClasses]);

  const updateAuthority = useMutation({
    mutationFn: async () => {
      console.log("Updating authority with:", {
        teacherId,
        classIds: selectedClasses,
      });

      const response = await fetch(`/api/teachers/${teacherId}/authority`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classIds: selectedClasses,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update authority");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) && 
            (
              queryKey[0] === "/api/teachers" ||
              (queryKey[0] === `/api/teachers/${teacherId}`) ||
              (queryKey[1] === teacherId && queryKey[2] === "classes")
            )
          );
        }
      });

      toast({
        title: "Success",
        description: "Authority updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to update authority:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update authority",
        variant: "destructive",
      });
    },
  });

  const getBranchName = (branchId: number | null) => {
    if (!branchId || !branches) return "No Branch";
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : "Unknown Branch";
  };

  const filteredClasses = classes?.filter(cls => 
    selectedBranch === "all" || cls.branchId?.toString() === selectedBranch
  ).sort((a, b) => {
    const branchA = getBranchName(a.branchId);
    const branchB = getBranchName(b.branchId);

    // First sort by branch name
    if (branchA < branchB) return -1;
    if (branchA > branchB) return 1;

    // If same branch, sort by class name
    return a.name.localeCompare(b.name);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grant Authority</DialogTitle>
          <DialogDescription>
            Select classes to grant access to this teacher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Label htmlFor="branch-filter">Filter by Branch:</Label>
            <Select
              value={selectedBranch}
              onValueChange={setSelectedBranch}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Individual Classes</h3>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {filteredClasses?.map((cls) => (
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
                    <div className="flex-1">
                      <Label htmlFor={`class-${cls.id}`} className="flex items-center">
                        <span className="text-sm text-muted-foreground mr-2">
                          [{getBranchName(cls.branchId)}]
                        </span>
                        <span>{cls.name}</span>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateAuthority.mutate()} 
              disabled={updateAuthority.isPending}
            >
              {updateAuthority.isPending ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}