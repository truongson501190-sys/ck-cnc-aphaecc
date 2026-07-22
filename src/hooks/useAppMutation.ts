// src/hooks/useAppMutation.ts
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

interface UseAppMutationOptions<TData, TVariables, TContext = unknown>
  extends UseMutationOptions<TData, Error, TVariables, TContext> {
  successMessage?: string;
  errorMessage?: string;
  trackEvent?: {
    name: string;
    category: string;
  };
}

export function useAppMutation<TData, TVariables = void, TContext = unknown>(
  options: UseAppMutationOptions<TData, TVariables, TContext>
) {
  const {
    successMessage,
    errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    trackEvent: trackEventConfig,
    ...mutationOptions
  } = options;

  return useMutation({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      if (trackEventConfig) {
        trackEvent(trackEventConfig.category, trackEventConfig.name);
      }
      mutationOptions.onSuccess?.(data, variables, undefined as never, context as never);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || errorMessage);
      mutationOptions.onError?.(error, variables, undefined as never, context as never);
    },
  });
}