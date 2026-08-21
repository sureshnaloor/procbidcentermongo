import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Page not found</h2>
        <p className="text-gray-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard"><Button>Go to Dashboard</Button></Link>
      </div>
    </div>
  );
}
