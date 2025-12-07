import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage } from "../storage/async-storage";
import type { Comment as ApiComment } from "../api/comments-api";

export type Comment = ApiComment;

export type CommentsState = {
  // Map: parent content (post or comment) -> comments list
  commentsByParent: Record<string, Comment[]>;
  lastCommentSaveAt: number | null;

  // Replace comments for a single parent
  setComments: (parentId: string, comments: Comment[]) => void;

  // Insert or upsert a single comment
  insertComment: (comment: Comment) => void;

  // Update a comment by id (text / liker_ids / timestamps, etc.)
  updateComment: (
    id: string,
    changes: Partial<
      Omit<Comment, "id" | "creator_id" | "parent_content_id" | "parent_content_type">
    >
  ) => void;

  // Remove comment by id (regardless of parent)
  removeComment: (id: string) => void;

  clear: () => void;
};

export const useCommentsStore = create<CommentsState>()(
  persist(
    (set) => ({
      commentsByParent: {},
      lastCommentSaveAt: null,

      setComments: (parentId, comments) =>
        set((state) => ({
          commentsByParent: {
            ...state.commentsByParent,
            [parentId]: comments,
          },
          lastCommentSaveAt: Date.now(),
        })),

      insertComment: (comment) =>
        set((state) => {
          const parentId = comment.parent_content_id;
          const existing = state.commentsByParent[parentId] ?? [];
          const idx = existing.findIndex((c) => c.id === comment.id);

          let next: Comment[];
          if (idx === -1) {
            next = [...existing, comment];
          } else {
            next = [...existing];
            next[idx] = { ...next[idx], ...comment };
          }

          return {
            commentsByParent: {
              ...state.commentsByParent,
              [parentId]: next,
            },
            lastCommentSaveAt: Date.now(),
          };
        }),

      updateComment: (id, changes) =>
        set((state) => {
          const map = { ...state.commentsByParent };
          let changed = false;

          for (const [parentId, list] of Object.entries(map)) {
            const idx = list.findIndex((c) => c.id === id);
            if (idx !== -1) {
              const nextList = [...list];
              nextList[idx] = { ...nextList[idx], ...changes };
              map[parentId] = nextList;
              changed = true;
              break;
            }
          }

          return changed
            ? { commentsByParent: map, lastCommentSaveAt: Date.now() }
            : state;
        }),

      removeComment: (id) =>
        set((state) => {
          const map: Record<string, Comment[]> = {};
          let changed = false;

          for (const [parentId, list] of Object.entries(state.commentsByParent)) {
            const filtered = list.filter((c) => c.id !== id);
            if (filtered.length !== list.length) {
              changed = true;
            }
            map[parentId] = filtered;
          }

          return changed
            ? { commentsByParent: map, lastCommentSaveAt: Date.now() }
            : state;
        }),

      clear: () => ({
        commentsByParent: {},
        lastCommentSaveAt: null,
      }),
    }),
    {
      name: "comments-store",
      storage: createJSONStorage(() => storage),
    }
  )
);
