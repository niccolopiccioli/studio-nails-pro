import { createFileRoute, Outlet, Navigate, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: StaffGuard,
});

/** Area staff solo su Veluna (gestionale centrale). Sui siti pubblici
 *  studio-nails / estetica-pura queste route rimandano alla home. */
function StaffGuard() {
  const brand = useBrand();
  if (brand.theme !== "veluna") return <Navigate to="/" replace />;
  return <Outlet />;
}
