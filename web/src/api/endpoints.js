import api, { refreshSession } from "./client";

export const keys = {
  posts: (params) => ["posts", params],
  post: (slug) => ["post", slug],
  comments: (slug) => ["comments", slug],
  categories: () => ["categories"],
  me: ["me"],
};

/* --- auth ----------------------------------------------------------------- */

/** Prime the CSRF cookie so the first write can carry a matching header. */
export async function fetchCsrf() {
  await api.get("/auth/csrf/");
}

export { refreshSession };

export async function login({ email, password }) {
  await api.post("/auth/login/", { email, password });
}

export async function register(payload) {
  const { data } = await api.post("/user/register/", payload);
  return data.user;
}

export async function logout() {
  try {
    await api.post("/auth/logout/");
  } catch {
    // The cookies are cleared by the server response; a failed call (expired
    // session, offline) must not strand the user in a signed-in state.
  }
}

export async function fetchMe() {
  const { data } = await api.get("/user/me/");
  return data;
}

/* --- categories ----------------------------------------------------------- */

export async function fetchCategories() {
  const { data } = await api.get("/categories/");
  return data;
}

export async function createCategory(name) {
  const { data } = await api.post("/categories/", { name });
  return data;
}

/* --- posts ---------------------------------------------------------------- */

export async function fetchPosts(params) {
  const { data } = await api.get("/posts/", { params });
  return data;
}

export async function fetchPost(slug) {
  const { data } = await api.get(`/posts/${slug}/`);
  return data;
}

export async function createPost(payload) {
  const { data } = await api.post("/posts/", payload);
  return data;
}

export async function updatePost(slug, payload) {
  const { data } = await api.patch(`/posts/${slug}/`, payload);
  return data;
}

export async function deletePost(slug) {
  await api.delete(`/posts/${slug}/`);
}

export async function votePost(slug, value) {
  const { data } = await api.post(`/posts/${slug}/vote/`, { value });
  return data;
}

/* --- comments ------------------------------------------------------------- */

export async function fetchComments(slug) {
  const { data } = await api.get(`/posts/${slug}/comments/`);
  return data;
}

export async function createComment(slug, payload) {
  const { data } = await api.post(`/posts/${slug}/comments/`, payload);
  return data;
}

export async function updateComment(id, payload) {
  const { data } = await api.patch(`/posts/comments/${id}/`, payload);
  return data;
}

export async function deleteComment(id) {
  await api.delete(`/posts/comments/${id}/`);
}