import { execFileSync } from "node:child_process";
import path from "node:path";

const API_ROOT = path.resolve(import.meta.dirname, "../../../api");

export default function globalTeardown() {
  const runId = process.env.PW_RUN_ID;
  if (!runId) return;

  // Order matters. Post.category is on_delete=PROTECT, so a category cannot go
  // while any post still points at it, and a post only goes when its author
  // does. Posts are therefore removed explicitly before either of those.
  //
  // Each step is independent: an early failure must not skip the rest, or one
  // bad row leaves the whole suite's data behind for the next run to trip on.
  const script = `
from django.db import transaction
from users.models import CustomUser
from blog.models import Category, Post

removed = {}


def step(name, fn):
    try:
        with transaction.atomic():
            removed[name] = fn()
    except Exception as exc:
        removed[name] = "FAILED: %s" % type(exc).__name__


# Every account this suite can produce: API-seeded and UI-registered for this
# run, plus any left by earlier runs.
step(
    "users",
    lambda: CustomUser.objects.filter(email__contains="pwtest+").delete()[0],
)

# Categories carry no run id, so the fixture tags them by name instead. Matched
# case-insensitively because the model title-cases names on save.
step(
    "posts",
    lambda: Post.objects.filter(category__name__istartswith="PWTest").delete()[0],
)

# Anything still holding a test category open: drafts and posts whose author was
# already removed above are gone, this catches the remainder.
step(
    "categories",
    lambda: Category.objects.filter(name__istartswith="PWTest").delete()[0],
)

# Accounts registered through the UI before they were given a run-scoped address.
step(
    "legacy",
    lambda: CustomUser.objects.filter(
        email__regex=r"^(new|fresh|short|mm)-.*@example\\.test$"
    ).delete()[0],
)

print("teardown for run", "${runId}", "-", ", ".join(
    "%s: %s" % (name, count) for name, count in removed.items()
))
`;

  try {
    execFileSync("python", ["manage.py", "shell", "-c", script], {
      cwd: API_ROOT,
      stdio: "inherit",
    });
  } catch (error) {
    console.error(`teardown failed for run ${runId}: ${error.message}`);
  }
}