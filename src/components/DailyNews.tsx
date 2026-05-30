import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  author?: string;
}

export function DailyNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Dùng rss2json.com API (miễn phí, không CORS)
        const rssUrl = 'https://news.ycombinator.com/rss';
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && data.items) {
          // Lấy 5 tin mới nhất
          const latestNews = data.items.slice(0, 5).map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
            author: item.author,
          }));
          setNews(latestNews);
          setError(null);
        } else {
          throw new Error('Failed to fetch news');
        }
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Không thể tải tin tức. Vui lòng thử lại sau.');
        // Dữ liệu mẫu dự phòng
        setNews([
          { title: 'SQLite is all you need for durable workflows', link: '#', pubDate: new Date().toISOString(), description: '' },
          { title: 'Algebraic Effects for the Rest of Us', link: '#', pubDate: new Date().toISOString(), description: '' },
          { title: 'Danish pension fund excludes SpaceX', link: '#', pubDate: new Date().toISOString(), description: '' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    // Refresh mỗi 5 phút
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Card className="shadow-sm border-l-4 border-blue-500 rounded-xl h-full">
      <CardHeader className="py-3 border-b bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
          <Newspaper className="w-5 h-5" /> Tin tức công nghệ
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-blue-500 w-5 h-5" />
          </div>
        )}
        
        {!loading && error && (
          <div className="text-xs text-amber-600 italic bg-amber-50 p-2 rounded flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {!loading && !error && news.map((item, idx) => (
          <a 
            key={idx} 
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block group border-b border-slate-100 pb-2 last:border-0 last:pb-0"
          >
            <h3 className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              {item.pubDate && <span>{formatDate(item.pubDate)}</span>}
              {item.author && <span>• {item.author}</span>}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
        
        {!loading && !error && news.length === 0 && (
          <div className="text-xs text-slate-500 italic text-center py-4">
            Đang cập nhật tin tức...
          </div>
        )}
      </CardContent>
    </Card>
  );
}