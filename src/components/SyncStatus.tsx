import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { dataSync } from '@/lib/dataSync';
import { getSupabase } from '@/supabase';

interface SyncStatusProps {
  compact?: boolean;
}

export function SyncStatus({ compact = false }: SyncStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(dataSync.isConnected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const success = await dataSync.fullSync();
      if (success) {
        setLastSync(new Date());
        toast.success('Đồng bộ dữ liệu thành công!');
      } else {
        toast.error('Đồng bộ thất bại. Kiểm tra kết nối mạng.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Lỗi khi đồng bộ dữ liệu.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className="text-xs font-medium text-gray-600">
          {isConnected ? (isSyncing ? 'Đang đồng bộ...' : 'Online') : 'Offline'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 rounded-full"
          onClick={handleSync}
          disabled={!isConnected || isSyncing}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          Trạng thái đồng bộ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Kết nối đám mây:</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </div>

        {lastSync && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Đồng bộ cuối:</span>
            <span className="text-sm text-gray-500">
              {lastSync.toLocaleTimeString('vi-VN')}
            </span>
          </div>
        )}

        <Button
          onClick={handleSync}
          disabled={!isConnected || isSyncing}
          className="w-full"
          variant="outline"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Đang đồng bộ...
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 mr-2" />
              Đồng bộ ngay
            </>
          )}
        </Button>

        {!isConnected && (
          <p className="text-xs text-gray-500 text-center">
            Dữ liệu chỉ lưu cục bộ. Kết nối internet để đồng bộ.
          </p>
        )}
      </CardContent>
    </Card>
  );
}