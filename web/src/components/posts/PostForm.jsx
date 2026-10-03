import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Eye, PenLine } from "lucide-react";

import {
  createCategory,
  createPost,
  fetchCategories,
  keys,
  updatePost,
} from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import Input from "@/components/ui/8bit/Input";
import Select from "@/components/ui/8bit/Select";
import MarkdownBody from "@/lib/MarkdownBody";
import { applyApiErrors } from "@/lib/formErrors";

const KNOWN_FIELDS = [
  "title",
  "excerpt",
  "content",
  "category",
  "status",
  "thumbnail",
];

function toFormData(values) {
  const data = new FormData();
  data.append("title", values.title);
  data.append("excerpt", values.excerpt?.trim() ?? "");
  data.append("content", values.content);
  data.append("category", String(values.category));
  data.append("status", values.status);
  const file = values.thumbnail?.[0];
  if (file) data.append("thumbnail", file);
  return data;
}

export default function PostForm({ post = null, onSaved }) {
  const isEdit = Boolean(post);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("write");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: keys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: post?.title ?? "",
      excerpt: post?.excerpt ?? "",
      content: post?.content ?? "",
      category: post?.category ?? "",
      status: post?.status ?? "published",
      newCategoryName: "",
    },
  });

  const categoryValue = useWatch({ control, name: "category" });

  const [preview, setPreview] = useState(post?.content ?? "");

  const categoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: keys.categories() });
      setShowNewCategory(false);
      reset((values) => ({ ...values, category: category.id, newCategoryName: "" }));
    },
    onError: (error) =>
      setError("newCategoryName", {
        message: applyApiErrorsOrMessage(error),
      }),
  });

  function applyApiErrorsOrMessage(error) {
    const first = Object.values(error?.response?.data ?? {});
    if (Array.isArray(first[0])) return first[0].join(" ");
    return "Could not create the category.";
  }

  const postMutation = useMutation({
    mutationFn: async (values) => {
      if (isEdit) return updatePost(post.slug, toFormData(values));
      return createPost(toFormData(values));
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // keys.post is keyed "post", not "posts", so listing invalidation alone
      // leaves the open detail page showing the pre-edit copy.
      queryClient.invalidateQueries({ queryKey: keys.post(saved.slug) });
      if (isEdit && post.slug !== saved.slug) {
        queryClient.invalidateQueries({ queryKey: keys.post(post.slug) });
      }
      queryClient.invalidateQueries({ queryKey: keys.categories() });
      onSaved(saved);
    },
    onError: (error) => applyApiErrors(error, setError, KNOWN_FIELDS),
  });

  const content = preview;

  const pending = isSubmitting || categoryMutation.isPending;

  function onSubmit(values) {
    postMutation.mutate(values);
  }

  const contentField = register("content", {
    required: "Content is required.",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        name="title"
        label="Title"
        placeholder="Something worth reading"
        {...register("title", { required: "Title is required." })}
        error={errors.title?.message}
      />

      <Input
        name="excerpt"
        label="Excerpt"
        hint="Optional. One line shown on the home page."
        {...register("excerpt")}
        error={errors.excerpt?.message}
      />

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="content" className="pixel-label text-ink-muted">
            Content
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode((current) => (current === "write" ? "preview" : "write"))}
            aria-pressed={mode === "preview"}
          >
            {mode === "write" ? (
              <>
                <Eye size={12} aria-hidden="true" />
                Preview
              </>
            ) : (
              <>
                <PenLine size={12} aria-hidden="true" />
                Write
              </>
            )}
          </Button>
        </div>

        {mode === "write" ? (
          <textarea
            id="content"
            rows={16}
            placeholder="Markdown supported: # headings, **bold**, - lists, [links](...)"
            className={`field${errors.content?.message ? " field-invalid" : ""}`}
            aria-invalid={errors.content?.message ? "true" : undefined}
            aria-describedby={
              errors.content?.message ? "content-error" : undefined
            }
            {...contentField}
            onChange={(event) => {
              contentField.onChange(event);
              setPreview(event.target.value);
            }}
          />
        ) : (
          <div className="panel p-4 min-h-64">
            {content.trim() ? (
              <MarkdownBody>{content}</MarkdownBody>
            ) : (
              <p className="text-ink-subtle text-sm">Nothing to preview yet.</p>
            )}
          </div>
        )}

        {errors.content?.message && (
          <p id="content-error" className="mt-2 text-sm" role="alert">
            <span className="pixel-label">error:</span> {errors.content.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {showNewCategory ? (
          <div className="flex flex-col gap-2">
            <Input
              name="newCategoryName"
              label="New category"
              autoFocus
              {...register("newCategoryName", { required: "Name is required." })}
              error={errors.newCategoryName?.message}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={pending}
                onClick={() => categoryMutation.mutate(getValues("newCategoryName"))}
              >
                {categoryMutation.isPending ? "Adding" : "Add"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCategory(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Select
              name="category"
              label="Category"
              {...register("category", {
                required: "Pick a category.",
                validate: (value) => value !== "" || "Pick a category.",
              })}
              // Driven by form state rather than the DOM: the options arrive
              // after mount, and a controlled select re-applies its value when
              // they do. Left uncontrolled, an edit would silently lose the
              // post's category and fail validation on submit.
              value={categoryValue ?? ""}
              onChange={(event) =>
                setValue("category", event.target.value, { shouldValidate: true })
              }
              error={errors.category?.message}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <div className="flex items-end pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCategory(true)}
              >
                + New category
              </Button>
            </div>
          </>
        )}

        <Select
          name="status"
          label="Status"
          {...register("status")}
          error={errors.status?.message}
        >
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>

        <Input
          name="thumbnail"
          label="Thumbnail"
          type="file"
          accept="image/*"
          hint={post?.thumbnail ? "Leave empty to keep the current image." : "Optional. Max 5 MB."}
          {...register("thumbnail")}
          error={errors.thumbnail?.message}
        />
      </div>

      {errors.root?.message && (
        <p className="panel p-3 text-sm" role="alert">
          {errors.root.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {isSubmitting
            ? "Saving"
            : isEdit
              ? "Save changes"
              : "Publish post"}
        </Button>
        <p className="text-xs text-ink-subtle">
          Drafts are visible only to you, on the My Posts page.
        </p>
      </div>
    </form>
  );
}