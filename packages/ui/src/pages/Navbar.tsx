import { Link } from '@tanstack/react-router';
import { ModeToggle } from '@/components/mode-toggle';

export default function Navbar() {
  return (
    <div className="p-4 border-b flex justify-between">
      <h1 className="font-bold text-xl">CloudMatrix</h1>
      <div className="space-x-4">
        <Link to="/" className="hover:underline">Dashboard</Link>
        <Link to="/project" className="hover:underline">Project</Link>
        <ModeToggle />
      </div>
    </div>
  );
}
