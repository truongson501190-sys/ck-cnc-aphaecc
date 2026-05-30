import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, AlertCircle, Loader2 } from 'lucide-react';

export function DailyNews() {
  const [externalNews, setExternalNews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dùng đường dẫn đầy đủ và thử lại qua một server trung gian an toàn hơn
    const fetchNews = async () => {
      try {
        // Thêm mode 'no-cors' hoặc dùng API khác nếu bị chặn
        const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://vnexpress.net/rss/khoa-hoc.rss'));
        
        if (!res.ok) throw new Error("Server từ chối kết nối");
        
        const data = await res.json();
        // Parser thủ công từ dữ liệu trả về của allorigins
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 5).map(item => ({
          title: item.querySelector("title")?.textContent,
          link: item.querySelector("link")?.textContent
        }));

        setExternalNews(items);
      } catch (err) {
        console.error(err);
        setError("Không tải được tin. Vui lòng kiểm tra lại kết nối.");
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
          <Newspaper className="w-5 h-5" /> Tin tức
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>}
        
        {error ? (
          <div className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
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