// src/hooks/useAppQuery.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseAppQueryOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, 'onError'> {
  errorMessage?: string;
  showErrorToast?: boolean;
  onError?: (error: TError) => void;
}

export function useAppQuery<TData, TError = Error>(
  options: UseAppQueryOptions<TData, TError>
) {
  const { errorMessage = 'Đã có lỗi xảy ra khi tải dữ liệu.', showErrorToast = true, onError, ...queryOptions } = options;

  return useQuery({
    ...queryOptions,
    queryFn: async (context: any) => {
      try {
        if (!queryOptions.queryFn || typeof queryOptions.queryFn === 'symbol') {
          return undefined as TData;
        }
        return await queryOptions.queryFn(context);
      } catch (error) {
        if (showErrorToast) {
          toast.error(errorMessage);
        }
        onError?.(error as TError);
        throw error;
      }
    },
  } as any);
}