import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export const getGetSumupConfigQueryKey = () => ["/wallet/recharge/sumup/config"];

export const useGetSumupConfig = () => {
  return useQuery({
    queryKey: getGetSumupConfigQueryKey(),
    queryFn: () => customFetch<{ enabled: boolean }>("/wallet/recharge/sumup/config", {
      method: "GET",
    }),
  });
};

export const useInitiateSumupCheckout = () => {
  return useMutation({
    mutationFn: (data: { amountEur: number }) => customFetch<{
      checkoutId: string;
      amountEur: number;
      status: string;
    }>("/wallet/recharge/sumup/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  });
};

export const useConfirmSumupCheckout = () => {
  return useMutation({
    mutationFn: (data: { checkoutId: string }) => customFetch<{
      success: boolean;
      alreadyCaptured?: boolean;
      newBalance: number | null;
      amountEur: number;
    }>("/wallet/recharge/sumup/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  });
};
