// src/components/DailyNews.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Loader2, ExternalLink, Calendar } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

export function DailyNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const rssUrl = 'https://vnexpress.net/rss/khoa-hoc.rss';
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && data.items) {
          // Lấy 15 tin để fill đầy trang
          const newsItems = data.items.slice(0, 15).map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
          }));
          setNews(newsItems);
          setError(null);
        } else {
          throw new Error('Không thể lấy tin tức');
        }
      } catch (err) {
        console.error('Lỗi:', err);
        setError('Không thể tải tin tức');
        // Dữ liệu mẫu - giống như trong hình của bạn
        setNews(mockNewsData);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    } catch {
      return '';
    }
  };

  return (
    <Card className="shadow-sm border-l-4 border-red-500 rounded-xl h-full flex flex-col">
      <CardHeader className="py-3 border-b bg-red-50 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-base">
            <Newspaper className="w-5 h-5" />
            <span>📰 Tin nóng VNExpress</span>
          </div>
          <span className="text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
            🔥 Mới nhất
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4 pb-4 flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-red-500 w-6 h-6" />
          </div>
        )}
        
        {!loading && error && (
          <div className="text-center text-slate-400 py-8 text-sm">
            {error}
          </div>
        )}
        
        {!loading && !error && (
          <div className="space-y-4">
            {news.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group border-b border-slate-100 pb-3 last:border-0 hover:bg-slate-50 rounded-lg transition-all p-2 -mx-2"
              >
                <h3 className="text-sm font-medium text-slate-800 group-hover:text-red-600 transition-colors leading-snug">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(item.pubDate)}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Dữ liệu mẫu từ hình của bạn
const mockNewsData: NewsItem[] = [
  { title: 'Giám đốc Mastercard Việt Nam: Nhiều người Việt sống "thuần di động"', link: '#', pubDate: '2026-05-30' },
  { title: 'Lý do một số web lậu bị triệt phá vẫn "sống lại"', link: '#', pubDate: '2026-05-30' },
  { title: 'Nỗi lo "trả lương" cho AI tốn hơn cho người', link: '#', pubDate: '2026-05-29' },
  { title: 'Phát hiện loài hải sâm có mô bắt tử', link: '#', pubDate: '2026-05-30' },
  { title: 'Trung Quốc cấp "căn cước" cho robot hình người', link: '#', pubDate: '2026-05-30' },
  { title: 'Tàu chạy bằng khí tự nhiên lớn nhất thế giới', link: '#', pubDate: '2026-05-29' },
  { title: 'Tìm kiếm giải pháp số xây đô thị bền vững', link: '#', pubDate: '2026-05-30' },
  { title: '"Bốn cùng" của doanh nghiệp để kết quả nghiên cứu ra khỏi phòng thí nghiệm', link: '#', pubDate: '2026-05-29' },
  { title: 'Xu hướng phát triển robot công nghiệp tại Việt Nam', link: '#', pubDate: '2026-05-28' },
  { title: 'Chuyển đổi số trong ngành cơ khí chế tạo', link: '#', pubDate: '2026-05-28' },
  { title: 'Giải pháp nâng cao hiệu suất máy CNC', link: '#', pubDate: '2026-05-27' },
  { title: 'Đào tạo nhân lực chất lượng cao cho ngành sản xuất', link: '#', pubDate: '2026-05-27' },
  { title: 'Ứng dụng AI trong bảo trì dự đoán', link: '#', pubDate: '2026-05-26' },
  { title: 'Tối ưu hóa quy trình sản xuất với IoT', link: '#', pubDate: '2026-05-26' },
  { title: 'Xuất khẩu sản phẩm cơ khí tăng trưởng ấn tượng', link: '#', pubDate: '2026-05-25' },
];