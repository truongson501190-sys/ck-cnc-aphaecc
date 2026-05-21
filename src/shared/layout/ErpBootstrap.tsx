import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bootstrapErpInventory } from '@/core/bootstrap';
import { inventoryQueryKeys } from '@/shared/hooks/useInventory';

/** Runs legacy migration once and invalidates inventory queries. */
export function ErpBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    bootstrapErpInventory().then(() => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });
  }, [queryClient]);

  return null;
}
