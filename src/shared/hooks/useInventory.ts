import { useQuery } from '@tanstack/react-query';
import {
  getOnHand,
  getOnHandByProduct,
  getMovements,
  getValuation,
  getProductOnHandInWarehouse,
} from '@/core/inventory-engine';
import { migrateLegacyTransactionsToLedger } from '@/core/stock-ledger/legacyMigration';

export const inventoryQueryKeys = {
  onHand: (warehouseId?: string) => ['inventory', 'onHand', warehouseId] as const,
  onHandProduct: () => ['inventory', 'onHandProduct'] as const,
  movements: (filter: string) => ['inventory', 'movements', filter] as const,
  valuation: (warehouseId?: string) => ['inventory', 'valuation', warehouseId] as const,
  productQty: (productId: string, warehouseId?: string) =>
    ['inventory', 'product', productId, warehouseId] as const,
};

export function useInventoryBootstrap() {
  return useQuery({
    queryKey: ['inventory', 'bootstrap'],
    queryFn: async () => migrateLegacyTransactionsToLedger(),
    staleTime: Infinity,
    retry: 1,
  });
}

export function useOnHand(warehouseId?: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.onHand(warehouseId),
    queryFn: () => getOnHand(warehouseId ? { warehouseId } : undefined),
    refetchOnWindowFocus: true,
  });
}

export function useOnHandByProduct() {
  return useQuery({
    queryKey: inventoryQueryKeys.onHandProduct(),
    queryFn: getOnHandByProduct,
    refetchOnWindowFocus: true,
  });
}

export function useLedgerMovements(filter: {
  warehouseId?: string;
  productId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}) {
  const key = JSON.stringify(filter);
  return useQuery({
    queryKey: inventoryQueryKeys.movements(key),
    queryFn: () => getMovements(filter),
    refetchOnWindowFocus: true,
  });
}

export function useValuation(warehouseId?: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.valuation(warehouseId),
    queryFn: () => getValuation(warehouseId ? { warehouseId } : undefined),
  });
}

export function useProductOnHand(productId: string, warehouseId?: string) {
  return useQuery({
    queryKey: inventoryQueryKeys.productQty(productId, warehouseId),
    queryFn: () => getProductOnHandInWarehouse(productId, warehouseId),
    enabled: !!productId,
  });
}
