import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { ensureStaffProfile, getStaffSession } from "@/lib/staff.functions";

export function useStaff() {
  const ensure = useServerFn(ensureStaffProfile);
  const session = useServerFn(getStaffSession);

  const bootstrap = useQuery({
    queryKey: ["staff-bootstrap"],
    queryFn: () => ensure({ data: {} }),
    staleTime: Infinity,
    retry: false,
  });

  const query = useQuery({
    queryKey: ["staff-session"],
    queryFn: () => session(),
    enabled: bootstrap.isSuccess,
  });

  useEffect(() => {
    if (bootstrap.isError) console.error(bootstrap.error);
  }, [bootstrap.isError, bootstrap.error]);

  const roles = query.data?.roles ?? bootstrap.data?.roles ?? [];
  return {
    isLoading: bootstrap.isLoading || query.isLoading,
    profile: query.data?.profile ?? bootstrap.data?.profile ?? null,
    studio: query.data?.studio ?? null,
    roles,
    isOwner: roles.includes("owner"),
    isManager: roles.includes("owner") || roles.includes("admin"),
  };
}
