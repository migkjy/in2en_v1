
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Branch } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CreateBranchDialog } from "./create-dialog";

export default function BranchList() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const queryClient = useQueryClient();
  
  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  if (isLoading) {
    return <div>Loading branches...</div>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Branch Management</h1>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Add Branch
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches?.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>{branch.id}</TableCell>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.address || '-'}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mr-2"
                      onClick={() => {
                        setSelectedBranch(branch);
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this branch?')) {
                          await fetch(`/api/branches/${branch.id}`, {
                            method: 'DELETE',
                          });
                          queryClient.invalidateQueries({ queryKey: ['/api/branches'] });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <CreateBranchDialog 
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) setSelectedBranch(null);
            }}
            branch={selectedBranch}
          />
        </div>
      </main>
    </div>
  );
}
