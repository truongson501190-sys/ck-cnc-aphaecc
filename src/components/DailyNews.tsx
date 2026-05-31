// src/components/DailyNews.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Loader2, ExternalLink, Calendar } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  thumbnail?: string | null;
}

// Khai báo mockNews phòng trường hợp lỗi API không bị crash
const mockNewsWithImages: NewsItem[] = [
  {
    title: 'Đang tải dữ liệu tin tức mới nhất...',
    link: '#',
    pubDate: new Date().toISOString(),
    description: 'Vui lòng đợi trong giây lát hệ thống đang kết nối dữ liệu...',
  }
];

export function DailyNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const rssUrl = 'https://vnexpress.net/rss/thoi-su.rss';
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && data.items) {
          const newsItems = data.items.slice(0, 10).map((item: any) => {
            let thumbnail = null;
            const imgMatch = item.description?.match(/<img.*?src=["'](.*?)["']/);
            if (imgMatch && imgMatch[1]) {
              thumbnail = imgMatch[1];
            }
            
            if (!thumbnail && item.content) {
              const contentImgMatch = item.content?.match(/<img.*?src=["'](.*?)["']/);
              if (contentImgMatch && contentImgMatch[1]) {
                thumbnail = contentImgMatch[1];
              }
            }
            
            return {
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              description: item.description?.replace(/<[^>]*>/g, '').substring(0, 90) || '',
              thumbnail: thumbnail,
            };
          });
          setNews(newsItems);
          setError(null);
        } else {
          throw new Error('Không thể lấy tin tức');
        }
      } catch (err) {
        console.error('Lỗi:', err);
        setError('Không thể tải tin tức');
        setNews(mockNewsWithImages);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hôm nay';
      if (diffDays === 1) return 'Hôm qua';
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } catch {
      return '';
    }
  };

  return (
    /* ĐÃ SỬA: 
       - `ml-auto mr-0`: Triệt tiêu căn giữa, ép sát hẳn về bên phải.
       - `self-end justify-self-end`: Đảm bảo dù nằm trong thẻ cha Flex hay Grid thì vẫn hít chặt lề phải.
    */
    <Card className="shadow-sm border-l-4 border-red-500 rounded-xl h-full flex flex-col w-full max-w-sm ml-auto mr-0 self-end justify-self-end">
      <CardHeader className="py-2.5 px-3 border-b bg-gradient-to-r from-red-50 to-orange-50 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-red-700 text-sm font-bold">
            <Newspaper className="w-4 h-4" />
            <span>Tin nóng VNExpress</span>
          </div>
          <span className="text-[10px] text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
            🔥 Mới
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-2 pb-2 px-3 flex-1 overflow-y-auto custom-scrollbar">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-red-500 w-5 h-5" />
          </div>
        )}
        
        {!loading && error && (
          <div className="text-center text-slate-400 py-6 text-xs">
            {error}
          </div>
        )}
        
        {!loading && !error && (
          <div className="space-y-2.5">
            {news.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group border-b border-slate-100 pb-2.5 last:border-0 hover:bg-slate-50 rounded-lg transition-all p-1.5 -mx-1.5"
              >
                <div className="flex gap-2.5">
                  {/* Ảnh tin tức */}
                  {item.thumbnail ? (
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                      <Newspaper className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                  
                  {/* Nội dung */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-slate-800 group-hover:text-red-600 transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{formatDate(item.pubDate)}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-slate-400" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}