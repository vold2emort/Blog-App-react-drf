import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { keys, updateComment } from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import Textarea from "@/components/ui/8bit/Textarea";
import { applyApiErrors } from "@/lib/formErrors";

export default function CommentEditForm({ slug, comment, onDone }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { content: comment.content ?? "" } });

  const mutation = useMutation({
    mutationFn: (content) => updateComment(comment.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.comments(slug) });
      onDone();
    },
    onError: (error) => applyApiErrors(error, setError, ["content"]),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values.content))}
      className="flex flex-col gap-3"
    >
      <Textarea
        id={`edit-comment-${comment.id}`}
        name="content"
        label="Edit comment"
        rows={3}
        {...register("content", { required: "Comment cannot be empty." })}
        error={errors.content?.message}
      />

      {errors.root?.message && (
        <p className="panel p-3 text-sm" role="alert">
          {errors.root.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}