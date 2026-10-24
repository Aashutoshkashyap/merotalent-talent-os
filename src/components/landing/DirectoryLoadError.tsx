import { Button } from "@/components/ui/button";

/** A failed request is not an empty directory. Retry reads only, never submissions. */
export default function DirectoryLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center text-sm text-red-700">
    <p>{message}</p>
    <Button type="button" variant="outline" className="mt-3" onClick={onRetry}>Try again</Button>
  </div>;
}
