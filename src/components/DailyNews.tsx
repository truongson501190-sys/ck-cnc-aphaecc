import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Loader2, ExternalLink, Calendar } from 'lucide-react';

interface VNNewsItem {
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string;
  description: string;
}

export function DailyNews() {
  const [news, setNews] = useState<VNNewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchVNNews = async () => {
      try {
        // Dùng RSS2JSON để lấy tin VNExpress kèm ảnh
        const rssUrl = 'https://vnexpress.net/rss/khoa-hoc.rss';
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && data.items) {
          const newsWithImages = data.items.slice(0, 6).map((item: any) => {
            // Trích xuất ảnh từ description hoặc content
            const imgMatch = item.description?.match(/<img.*?src="(.*?)"/);
            const thumbnail = imgMatch ? imgMatch[1] : null;
            
            return {
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              thumbnail: thumbnail || 'https://via.placeholder.com/400x200?text=News',
              description: item.description?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
            };
          });
          setNews(newsWithImages);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVNNews();
  }, []);

  return (
    <Card className="shadow-sm border-l-4 border-red-500 rounded-xl h-full">
      <CardHeader className="py-3 border-b bg-gradient-to-r from-red-50 to-slate-50">
        <CardTitle className="flex items-center gap-2 text-red-700 text-base">
          <Newspaper className="w-5 h-5" /> 🔥 Tin nóng VNExpress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[600px] overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-red-500 w-6 h-6" />
          </div>
        )}
        
        {!loading && news.map((item, idx) => (
          <a 
            key={idx} 
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block group border-b border-slate-100 pb-3 last:border-0 hover:bg-slate-50 rounded-lg transition-all p-2 -mx-2"
          >
            <div className="flex gap-3">
              {item.thumbnail && (
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.pubDate).toLocaleDateString('vi-VN')}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}