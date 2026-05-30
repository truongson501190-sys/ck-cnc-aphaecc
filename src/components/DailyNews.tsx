import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, AlertCircle, Loader2 } from 'lucide-react';

export function DailyNews() {
  const [externalNews, setExternalNews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Dùng RSS2JSON với API Key (nếu có) hoặc thử một endpoint thay thế nhanh hơn
        // Chú có thể lấy API Key miễn phí tại rss2json.com để không bị limit
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://vnexpress.net/rss/khoa-hoc.rss&api_key=YOUR_API_KEY_HERE');
        
        const data = await res.json();
        
        if (data.status === 'ok') {
          setExternalNews(data.items.slice(0, 5));
        } else {
          throw new Error("API Limit");
        }
      } catch (err) {
        // Nếu vẫn lỗi, con dùng phương án dự phòng: Không hiện tin mà hiện lời nhắn thay thế
        // để không làm hỏng giao diện
        setError("Tin tức tạm thời không khả dụng.");
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <Card className="shadow-sm border-l-4 border-blue-500 rounded-xl h-full">
      <CardHeader className="py-3 border-b bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
          <Newspaper className="w-5 h-5" /> Tin tức nóng
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>}
        
        {error ? (
          <div className="text-xs text-slate-500 italic">
            Hệ thống tin tức đang bảo trì, vui lòng quay lại sau.
          </div>
        ) : (
          externalNews.map((item, idx) => (
            <a key={idx} href={item.link} target="_blank" rel="noreferrer" className="block group">
              <h3 className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors leading-snug">
                {item.title}
              </h3>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}