import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BranchDetail() {
  const { id } = useParams();
  
  const { data: branch, isLoading } = useQuery({
    queryKey: ['/api/branches', id],
    queryFn: async () => {
      const response = await fetch(`/api/branches/${id}`);
      if (!response.ok) throw new Error('Failed to fetch branch');
      return response.json();
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{branch?.name || 'Branch Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Branch details will be implemented later */}
          <p>Branch ID: {id}</p>
        </CardContent>
      </Card>
    </div>
  );
}
