// app-mobile/services/auth-api.ts
import { makeAuthApi } from "../../common/services/make-auth-api";
import { axiosAdapter } from "./axios-adapter";
import { secureStoreToken } from "./access-token";

export const authApi = makeAuthApi(axiosAdapter, secureStoreToken);
