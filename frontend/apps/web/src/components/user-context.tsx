"use client";

import { createContext, useContext } from "react";

type UserInfo = { email: string; role: string };

const UserContext = createContext<UserInfo>({ email: "", role: "viewer" });

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({
  user,
  children,
}: {
  user: UserInfo;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
