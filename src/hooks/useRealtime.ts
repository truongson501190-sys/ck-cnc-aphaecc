// src/hooks/useRealtime.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  onData?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useRealtime<T = any>({
  table,
  event = '*',
  schema = 'public',
  filter,
  onData,
  onError,
}: UseRealtimeOptions) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Hàm xử lý INSERT
  const handleInsert = useCallback((payload: any) => {
    setData((prev) => [...prev, payload.new as T]);
  }, []);

  // Hàm xử lý UPDATE
  const handleUpdate = useCallback((payload: any) => {
    setData((prev) =>
      prev.map((item: any) =>
        item.id === payload.new.id ? payload.new : item
      )
    );
  }, []);

  // Hàm xử lý DELETE
  const handleDelete = useCallback((payload: any) => {
    setData((prev) =>
      prev.filter((item: any) => item.id !== payload.old.id)
    );
  }, []);

  // Hàm xử lý payload từ realtime
  const handleRealtimePayload = useCallback((payload: any) => {
    console.log('Realtime update:', payload);
    onData?.(payload);

    switch (payload.eventType) {
      case 'INSERT':
        handleInsert(payload);
        break;
      case 'UPDATE':
        handleUpdate(payload);
        break;
      case 'DELETE':
        handleDelete(payload);
        break;
      default:
        break;
    }
  }, [onData, handleInsert, handleUpdate, handleDelete]);

  // Hàm fetch dữ liệu ban đầu
  const fetchData = useCallback(async () => {
    try {
      const { data: initialData, error: fetchError } = await supabase
        .from(table)
        .select('*');
      
      if (fetchError) throw fetchError;
      setData(initialData as T[]);
    } catch (err) {
      setError(err as Error);
      onError?.(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [table, onError]);

  // Effect: subscribe và fetch dữ liệu
  useEffect(() => {
    // Subscribe to changes
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        },
        handleRealtimePayload
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsLoading(false);
        }
        if (err) {
          setError(err);
          onError?.(err);
        }
      });

    channelRef.current = channel;

    // Fetch initial data
    fetchData();

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, event, schema, filter, handleRealtimePayload, fetchData, onError]);

  return { data, isLoading, error };
}