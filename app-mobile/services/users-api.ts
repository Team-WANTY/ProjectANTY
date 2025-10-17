// app-mobile/services/users-api.ts
import { makeUsersApi } from "../../common/services/make-users-api";
import { axiosAdapter } from "./axios-adapter";

export const usersApi = makeUsersApi(axiosAdapter, {
  me: "/users/me",
  byId: "/users/{user_id}",
  update: "/users/",
});
