import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold mb-4">Deployment Matrix</h2>
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Development</CardTitle>
          </CardHeader>
          <CardContent>
            <p>v1.2.3</p>
            <Button size="sm" className="mt-2">Promote to Staging</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Staging</CardTitle>
          </CardHeader>
          <CardContent>
            <p>v1.2.2</p>
            <Button size="sm" className="mt-2">Promote to Production</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Production</CardTitle>
          </CardHeader>
          <CardContent>
            <p>v1.2.1</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
