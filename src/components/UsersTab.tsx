import { User, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function UsersTab() {
  const users = [
    { id: "1", name: "You", email: "you@example.com", role: "Admin", status: "Active" },
    { id: "2", name: "Alice Smith", email: "alice@example.com", role: "Manager", status: "Active" },
    { id: "3", name: "Bob Jones", email: "bob@example.com", role: "Viewer", status: "Invited" }
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <User size={20} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Team Members</span>
      </div>

      <div className="border border-border rounded-xl flex flex-col overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">User</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Role</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-secondary/30">
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="opacity-80">
                    {user.role === 'Admin' && <Shield size={12} className="mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
