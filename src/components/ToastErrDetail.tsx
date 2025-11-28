import { toast } from "sonner";

export default function ToastErrDetail({ mes, error }: { mes?: string; error: Error }) {
  const id = toast.error(error.message);
  toast.error(() => (
    <div>
      {mes && <p className="mb-2">{mes}</p>}
      <pre className="rounded-md bg-muted p-3">
        {error.message}
      </pre>
    </div>
  ), { id });
}