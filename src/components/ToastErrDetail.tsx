import { toast } from "sonner";

export default function ToastErrDetail({ mes, error }: { mes?: string; error: Error | string }) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const id = toast.error(errorMessage);
  toast.error(() => (
    <div>
      {mes && <p className="mb-2">{mes}</p>}
      <pre className="rounded-md bg-muted p-3">
        {errorMessage}
      </pre>
    </div>
  ), { id });
}