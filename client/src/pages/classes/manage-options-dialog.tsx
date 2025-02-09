import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ManageOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageOptionsDialog({ open, onOpenChange }: ManageOptionsDialogProps) {
  const [newEnglishLevel, setNewEnglishLevel] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: englishLevels = [] } = useQuery({
    queryKey: ["/api/english-levels"],
  });

  const { data: ageGroups = [] } = useQuery({
    queryKey: ["/api/age-groups"],
  });

  const addEnglishLevel = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/english-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to add English level");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/english-levels"] });
      setNewEnglishLevel("");
      toast({ title: "Success", description: "English level added successfully" });
    },
  });

  const addAgeGroup = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/age-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to add age group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/age-groups"] });
      setNewAgeGroup("");
      toast({ title: "Success", description: "Age group added successfully" });
    },
  });

  const deleteEnglishLevel = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/english-levels/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete English level");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/english-levels"] });
      toast({ title: "Success", description: "English level deleted successfully" });
    },
  });

  const deleteAgeGroup = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/age-groups/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete age group");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/age-groups"] });
      toast({ title: "Success", description: "Age group deleted successfully" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Manage Class Options</DialogTitle>
          <DialogDescription>
            Add or remove English levels and age groups for classes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="english-levels">
          <TabsList>
            <TabsTrigger value="english-levels">English Levels</TabsTrigger>
            <TabsTrigger value="age-groups">Age Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="english-levels" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New English Level"
                value={newEnglishLevel}
                onChange={(e) => setNewEnglishLevel(e.target.value)}
              />
              <Button onClick={() => addEnglishLevel.mutate(newEnglishLevel)}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {englishLevels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>{level.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEnglishLevel.mutate(level.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="age-groups" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New Age Group"
                value={newAgeGroup}
                onChange={(e) => setNewAgeGroup(e.target.value)}
              />
              <Button onClick={() => addAgeGroup.mutate(newAgeGroup)}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAgeGroup.mutate(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
