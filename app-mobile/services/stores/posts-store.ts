import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage } from "../storage/async-storage";
import type { Post as ApiPost } from "../api/posts-api";

export type Post = ApiPost;

export type PostUpdate = Partial<Omit<Post, "id" | "creator_id">>;

type PostsState = {
  posts: Post[];
  lastPostSaveAt: number | null;

  setPosts: (posts: Post[]) => void;
  insertPost: (post: Post) => void;
  updatePost: (id: string, changes: PostUpdate) => void;
  removePost: (id: string) => void;
  clear: () => void;
};

export const usePostsStore = create<PostsState>()(
  persist(
    (set) => ({
      posts: [],
      lastPostSaveAt: null,

      setPosts: (posts) =>
        set({
          posts,
          lastPostSaveAt: Date.now(),
        }),

      insertPost: (post) =>
        set((state) => {
          const idx = state.posts.findIndex((p) => p.id === post.id);
          if (idx === -1) {
            return {
              posts: [...state.posts, post],
              lastPostSaveAt: Date.now(),
            };
          }
          const next = [...state.posts];
          next[idx] = { ...next[idx], ...post };
          return {
            posts: next,
            lastPostSaveAt: Date.now(),
          };
        }),

      updatePost: (id, changes) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === id ? { ...p, ...changes } : p
          ),
          lastPostSaveAt: Date.now(),
        })),

      removePost: (id) =>
        set((state) => ({
          posts: state.posts.filter((p) => p.id !== id),
          lastPostSaveAt: Date.now(),
        })),

      clear: () => ({
        posts: [],
        lastPostSaveAt: null,
      }),
    }),
    {
      name: "posts-store",
      storage: createJSONStorage(() => storage),
    }
  )
);
