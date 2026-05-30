// Phiên bản đơn giản, không ảnh - giống layout bạn gửi
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Loader2, ExternalLink, Calendar } from 'lucide-react';

export function DailyNews() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://vnexpress.net/rss/khoa-hoc.rss')}`
        );
        const data = await response.json();
        if (data.status === 'ok') {
          setNews(data.items.slice(0, 8));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <Card className="shadow-sm border-l-4 border-red-500 rounded-xl h-full">
      <CardHeader className="py-3 border-b bg-red-50">
        <CardTitle className="flex items-center gap-2 text-red-700 text-base">
          <Newspaper className="w-5 h-5" /> Tin nóng VNExpress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3 max-h-[500px] overflow-y-auto">
        {loading && <Loader2 className="animate-spin mx-auto my-8" />}
        
        {!loading && news.map((item, idx) => (
          <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="block group">
            <h3 className="text-sm font-medium text-slate-800 group-hover:text-red-600 transition-colors leading-snug">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>{new Date(item.pubDate).toLocaleDateString('vi-VN')}</span>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}