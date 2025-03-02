import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherDetail() {
  const { id } = useParams();
  
  const { data: teacher, isLoading } = useQuery({
    queryKey: ['/api/teachers', id],
    queryFn: async () => {
      const response = await fetch(`/api/teachers/${id}`);
      if (!response.ok) throw new Error('Failed to fetch teacher');
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
          <CardTitle>{teacher?.name || 'Teacher Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Teacher details will be implemented later */}
          <p>Teacher ID: {id}</p>
        </CardContent>
      </Card>
    </div>
  );
}
