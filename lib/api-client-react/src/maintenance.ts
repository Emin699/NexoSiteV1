import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type MaintenanceFlags = {
  paypalEnabled: boolean;
  sumupEnabled: boolean;
  ltcEnabled: boolean;
};

export const getMaintenanceQueryKey = () => ["/api/maintenance"];

export const useGetMaintenance = () => {
  return useQuery({
    queryKey: getMaintenanceQueryKey(),
    queryFn: () => customFetch<MaintenanceFlags>("/api/maintenance", { method: "GET" }),
    staleTime: 15_000,
  });
};

export const useAdminGetMaintenance = () => {
  return useQuery({
    queryKey: ["/api/admin/maintenance"],
    queryFn: () => customFetch<MaintenanceFlags>("/api/admin/maintenance", { method: "GET" }),
  });
};

export const useAdminUpdateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MaintenanceFlags>) =>
      customFetch<MaintenanceFlags>("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/maintenance"] });
      qc.invalidateQueries({ queryKey: getMaintenanceQueryKey() });
    },
  });
};
