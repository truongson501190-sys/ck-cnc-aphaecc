import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, AlertCircle, Loader2, ExternalLink, Calendar, Eye } from 'lucide-react';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
  author: string | null;
}

export function DailyNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // NewsAPI - cần đăng ký key miễn phí tại https://newsapi.org/
        // Free plan: 100 requests/ngày
        const apiKey = 'YOUR_NEWSAPI_KEY'; // Thay bằng key của bạn
        const apiUrl = `https://newsapi.org/v2/top-headlines?country=vn&category=technology&pageSize=6&apiKey=${apiKey}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && data.articles) {
          setNews(data.articles);
          setError(null);
        } else {
          throw new Error('API limit or invalid key');
        }
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Không thể tải tin tức. Vui lòng thử lại sau.');
        // Dữ liệu mẫu có ảnh
        setNews(mockNewsWithImages);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 10 * 60 * 1000); // Refresh 10 phút
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Vài phút trước';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Card className="shadow-sm border-l-4 border-blue-500 rounded-xl h-full overflow-hidden">
      <CardHeader className="py-3 border-b bg-gradient-to-r from-blue-50 to-slate-50">
        <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
          <Newspaper className="w-5 h-5" /> 🔥 Tin tức nóng trong ngày
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[600px] overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
          </div>
        )}
        
        {!loading && error && (
          <div className="text-xs text-amber-600 italic bg-amber-50 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {!loading && !error && news.map((article, idx) => (
          <a 
            key={idx} 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block group border-b border-slate-100 pb-3 last:border-0 hover:bg-slate-50 rounded-lg transition-all p-2 -mx-2"
          >
            <div className="flex gap-3">
              {/* Ảnh tin tức */}
              {article.urlToImage ? (
                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                  <img 
                    src={article.urlToImage} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Newspaper className="w-8 h-8 text-blue-400" />
                </div>
              )}
              
              {/* Nội dung tin */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {article.description || 'Nhấn để đọc tiếp...'}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(article.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.source.name}
                  </span>
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

// Dữ liệu mẫu có ảnh (dùng khi API lỗi)
const mockNewsWithImages: NewsArticle[] = [
  {
    title: '🚀 Việt Nam đón đầu xu hướng sản xuất thông minh 2026',
    description: 'Ngành cơ khí chính xác và CNC đang chuyển mình mạnh mẽ với sự tích hợp của AI và IoT.',
    url: '#',
    urlToImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=400',
    publishedAt: new Date().toISOString(),
    source: { name: 'Báo Công Nghệ' },
    author: null
  },
  {
    title: '⚙️ Công nghệ gia công 5 trục - Bước đột phá mới',
    description: 'Giải pháp tối ưu cho sản xuất linh kiện phức tạp với độ chính xác cao.',
    url: '#',
    urlToImage: 'https://images.unsplash.com/photo-1581092335871-4c8b4a2f1e2f?w=400',
    publishedAt: new Date().toISOString(),
    source: { name: 'Tạp chí Cơ khí' },
    author: null
  },
  {
    title: '💡 Đào tạo nhân lực ngành CNC: Thách thức và giải pháp',
    description: 'Nhu cầu nhân lực chất lượng cao đang tăng mạnh trong bối cảnh chuyển đổi số.',
    url: '#',
    urlToImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
    publishedAt: new Date().toISOString(),
    source: { name: 'Báo Giáo Dục' },
    author: null
  }
];