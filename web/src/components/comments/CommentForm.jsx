import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { createComment, keys } from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import Textarea from "@/components/ui/8bit/Textarea";
import { applyApiErrors } from "@/lib/formErrors";

export default function CommentForm({
  slug,
  parentId = null,
  onDone,
  autoFocus = false,
  submitLabel = "Post Comment",
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    mode: "onChange",
    defaultValues: { content: "" },
  });

  const mutation = useMutation({
    mutationFn: (content) => createComment(slug, { content, parent: parentId }),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: keys.comments(slug) });
      queryClient.invalidateQueries({ queryKey: keys.post(slug) });
      onDone?.();
    },
    onError: (error) => applyApiErrors(error, setError, ["content", "parent"]),
  });

  const busy = isSubmitting || mutation.isPending;

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values.content))}
      className="flex flex-col gap-3"
    >
      <Textarea
        id={`comment-${parentId ?? "new"}`}
        name="content"
        label={parentId ? "Reply" : "Add a comment"}
        placeholder={
          parentId ? "Write a reply..." : "Share your thoughts... (Markdown works)"
        }
        rows={3}
        autoFocus={autoFocus}
        {...register("content", { required: "Comment cannot be empty." })}
        error={errors.content?.message}
      />

      {errors.root?.message && (
        <p className="panel p-3 text-sm" role="alert">
          {errors.root.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={busy || !isValid}
        >
          {isSubmitting ? "Posting" : submitLabel}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}