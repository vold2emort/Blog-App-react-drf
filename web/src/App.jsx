import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";

// Everything below pulls in react-markdown or heavier form code, so it is
// split out of the initial bundle and fetched on demand.
const PostDetailPage = lazy(() => import("@/pages/PostDetailPage"));
const PostCreatePage = lazy(() => import("@/pages/PostCreatePage"));
const PostEditPage = lazy(() => import("@/pages/PostEditPage"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const MyPostsPage = lazy(() => import("@/pages/MyPostsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="panel p-8" role="status">
      <p className="pixel-label text-ink-muted">Loading</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="posts/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PostCreatePage />
            </Suspense>
          }
        />
        <Route
          path="posts/:slug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PostDetailPage />
            </Suspense>
          }
        />
        <Route
          path="posts/:slug/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PostEditPage />
            </Suspense>
          }
        />
        <Route
          path="categories"
          element={
            <Suspense fallback={<RouteFallback />}>
              <CategoryPage />
            </Suspense>
          }
        />
        <Route
          path="me"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MyPostsPage />
            </Suspense>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}