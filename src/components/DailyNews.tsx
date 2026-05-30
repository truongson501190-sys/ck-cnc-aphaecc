import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';

// Dữ liệu tin tức chú vừa cung cấp
const LATEST_NEWS = [
  { title: "SQLite is all you need for durable workflows", link: "https://obeli.sk/blog/sqlite-is-all-you-need-for-durable-workflows/" },
  { title: "Danish pension fund excludes SpaceX citing governance", link: "https://www.reuters.com/legal/transactional/danish-pension-fund-excludes-spacex-citing-governance-valuation-2026-05-29/" },
  { title: "Notes from the Mistral AI Now Summit", link: "https://koenvangilst.nl/lab/mistral-ai-now-summit" },
  { title: "Iron-rich immune cells help homing pigeons navigate", link: "https://www.science.org/content/article/mind-blowing-iron-rich-immune-cells-help-homing-pigeons-navigate" },
  { title: "Perry Compiles TypeScript directly to executables", link: "https://www.perryts.com/" }
];

export function DailyNews() {
  return (
    <Card className="shadow-sm border-l-4 border-orange-500 rounded-xl h-full">
      <CardHeader className="py-3 border-b bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-orange-700 text-base">
          <Newspaper className="w-5 h-5" /> Tin tức công nghệ (Hacker News)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {LATEST_NEWS.map((item, idx) => (
          <a 
            key={idx} 
            href={item.link} 
            target="_blank" 
            rel="noreferrer" 
            className="block hover:bg-slate-50 p-2 rounded transition-colors border-b last:border-0"
          >
            <h3 className="text-sm font-medium text-slate-800 hover:text-orange-700 leading-snug">
              {item.title}
            </h3>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}