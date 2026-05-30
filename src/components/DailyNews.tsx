// src/components/DailyNews.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, AlertCircle, Loader2, ExternalLink, Calendar, TrendingUp } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string | null;
}

export function DailyNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Dùng RSS2JSON API để lấy tin VNExpress (không bị CORS)
        const rssUrl = 'https://vnexpress.net/rss/khoa-hoc.rss';
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && data.items && data.items.length > 0) {
          const newsItems = data.items.slice(0, 8).map((item: any) => {
            // Trích xuất ảnh từ description (nếu có)
            let thumbnail = null;
            const imgMatch = item.description?.match(/<img.*?src=["'](.*?)["']/);
            if (imgMatch && imgMatch[1]) {
              thumbnail = imgMatch[1];
            }
            
            // Làm sạch description (loại bỏ HTML)
            const cleanDescription = item.description?.replace(/<[^>]*>/g, '').substring(0, 150) || '';
            
            return {
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              description: cleanDescription,
              thumbnail: thumbnail,
            };
          });
          setNews(newsItems);
          setError(null);
        } else {
          throw new Error('Không thể lấy dữ liệu tin tức');
        }
      } catch (err) {
        console.error('Lỗi khi lấy tin tức:', err);
        setError('Không thể tải tin tức. Vui lòng thử lại sau.');
        // Dữ liệu mẫu (fallback)
        setNews(mockNews);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    // Tự động refresh mỗi 10 phút
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hôm nay';
      if (diffDays === 1) return 'Hôm qua';
      return `${diffDays} ngày trước`;
    } catch {
      return '';
    }
  };

  return (
    <Card className="shadow-sm border-l-4 border-red-500 rounded-xl h-full overflow-hidden">
      <CardHeader className="py-3 border-b bg-gradient-to-r from-red-50 to-orange-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-base">
            <Newspaper className="w-5 h-5" />
            <span>Tin nóng VNExpress</span>
            <TrendingUp className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
            🔥 Mới nhất
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-3 max-h-[550px] overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="animate-spin text-red-500 w-6 h-6" />
            <p className="text-xs text-slate-400">Đang tải tin tức...</p>
          </div>
        )}
        
        {!loading && error && (
          <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {!loading && !error && news.map((item, idx) => (
          <a
            key={idx}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block group border-b border-slate-100 pb-3 last:border-0 hover:bg-slate-50 rounded-lg transition-all p-2 -mx-2"
          >
            <div className="flex gap-3">
              {/* Thumbnail */}
              {item.thumbnail ? (
                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
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
                <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                  <Newspaper className="w-8 h-8 text-red-400" />
                </div>
              )}
              
              {/* Nội dung */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(item.pubDate)}</span>
                  <span className="text-slate-300">•</span>
                  <span>VNExpress</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </a>
        ))}
        
        {!loading && !error && news.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Newspaper className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Đang cập nhật tin tức...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Dữ liệu mẫu (fallback)
const mockNews: NewsItem[] = [
  {
    title: 'Giám đốc Mastercard Việt Nam: Nhiều người Việt sống "thuần đi động"',
    description: 'Giám đốc Mastercard Việt Nam Sharad Jain cho rằng Việt Nam đang hình thành lối sống thuần đi động, với tỷ lệ thanh toán không tiền mặt tăng vọt.',
    link: '#',
    pubDate: new Date().toISOString(),
    thumbnail: null,
  },
  {
    title: 'Lý do một số web lậu bị triệt phá vẫn "sống lại"',
    description: 'Dù bị cơ quan chức năng mạnh tay triệt phá, nhiều website vi phạm bản quyền số về phim ảnh, thể thao vẫn có thể "sống lại" sau thời gian ngắn.',
    link: '#',
    pubDate: new Date().toISOString(),
    thumbnail: null,
  },
  {
    title: 'Nỗi lo "trả lương" cho AI còn hơn cho người',
    description: 'Chi phí sử dụng trí tuệ nhân tạo tại nhiều công ty đang tăng nhanh, cho thấy bài toán dùng AI thay thế nhân sự còn nhiều thách thức.',
    link: '#',
    pubDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    thumbnail: null,
  },
  {
    title: 'Phát hiện loài hải sâm có khả năng tự chữa lành',
    description: 'Các nhà nghiên cứu phát hiện mảnh mô của hải sâm Psolus fabricii có khả năng tự chữa lành và tiếp tục phát triển sau khi bị cắt rời.',
    link: '#',
    pubDate: new Date().toISOString(),
    thumbnail: null,
  },
  {
    title: 'Trung Quốc cấp "căn cước" cho robot hình người',
    description: 'Trung Quốc triển khai hệ thống căn cước kỹ thuật số cho robot hình người, đánh dấu bước tiến mới trong quản lý AI.',
    link: '#',
    pubDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    thumbnail: null,
  },
];