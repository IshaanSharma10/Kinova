import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon, X, Activity, BarChart3, TrendingUp, MessageSquare, Home, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

interface SearchResult {
  id: string;
  type: 'metric' | 'page' | 'feature';
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  category: string;
}

// Gait metrics database
const gaitMetrics: Omit<SearchResult, 'id'>[] = [
  {
    type: 'metric',
    title: 'Cadence',
    description: 'Number of steps taken per minute. Optimal range: 100-120 steps/min',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Gait Parameters',
  },
  {
    type: 'metric',
    title: 'Equilibrium',
    description: 'Balance and stability score. Optimal range: 0.85-0.95',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Balance',
  },
  {
    type: 'metric',
    title: 'Postural Sway',
    description: 'Body oscillation while maintaining balance. Optimal: 0-1 degrees',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Balance',
  },
  {
    type: 'metric',
    title: 'Walking Speed',
    description: 'Average walking velocity in m/s. Typical: 1.2-1.4 m/s',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Gait Parameters',
  },
  {
    type: 'metric',
    title: 'Stride Length',
    description: 'Distance covered per stride. Related to leg length',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Gait Parameters',
  },
  {
    type: 'metric',
    title: 'Step Width',
    description: 'Lateral distance between feet. Normal: 5-13cm',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Gait Parameters',
  },
  {
    type: 'metric',
    title: 'Knee Force',
    description: 'Force on knee joint during walking. Typically 1.5-2x body weight',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Biomechanics',
  },
  {
    type: 'metric',
    title: 'Frequency',
    description: 'Step frequency in Hz. Derived from cadence (cadence / 60)',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Gait Parameters',
  },
  {
    type: 'metric',
    title: 'Gait Symmetry',
    description: 'Balance between left and right steps. Optimal: close to 50%',
    url: '/comparison',
    icon: <Activity className="h-4 w-4" />,
    category: 'Gait Parameters',
  },
];

// Pages database
const pages: Omit<SearchResult, 'id'>[] = [
  {
    type: 'page',
    title: 'Dashboard',
    description: 'View real-time gait metrics and live sensor data',
    url: '/',
    icon: <Home className="h-4 w-4" />,
    category: 'Pages',
  },
  {
    type: 'page',
    title: 'Analytics',
    description: 'Historical data analysis and trends over time',
    url: '/analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    category: 'Pages',
  },
  {
    type: 'page',
    title: 'Insights',
    description: 'ML-powered gait score and personalized recommendations',
    url: '/insights',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'Pages',
  },
  {
    type: 'page',
    title: 'Comparison',
    description: 'Compare your metrics with ideal personalized values',
    url: '/comparison',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'Pages',
  },
  {
    type: 'page',
    title: 'Chatbot',
    description: 'Ask questions about gait parameters and analysis',
    url: '/chatbot',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'Pages',
  },
];

// Features database
const features: Omit<SearchResult, 'id'>[] = [
  {
    type: 'feature',
    title: 'Gait Score',
    description: 'Overall gait health score calculated from multiple parameters',
    url: '/insights',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'Features',
  },
  {
    type: 'feature',
    title: 'Real-time Monitoring',
    description: 'Live gait data from sensors',
    url: '/',
    icon: <Activity className="h-4 w-4" />,
    category: 'Features',
  },
  {
    type: 'feature',
    title: 'Personalized Recommendations',
    description: 'Get customized advice based on your gait data',
    url: '/insights',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'Features',
  },
];

// Combine all searchable items
const allSearchItems: SearchResult[] = [
  ...gaitMetrics.map((item, index) => ({ ...item, id: `metric-${index}` })),
  ...pages.map((item, index) => ({ ...item, id: `page-${index}` })),
  ...features.map((item, index) => ({ ...item, id: `feature-${index}` })),
];

export function Search({ placeholder = "Search gait metrics...", onSearch }: SearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Filter search results based on query
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();
    
    return allSearchItems
      .filter(item => {
        const titleMatch = item.title.toLowerCase().includes(lowerQuery);
        const descMatch = item.description.toLowerCase().includes(lowerQuery);
        const categoryMatch = item.category.toLowerCase().includes(lowerQuery);
        return titleMatch || descMatch || categoryMatch;
      })
      .slice(0, 8); // Limit to 8 results
  }, [query]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      metrics: [],
      pages: [],
      features: [],
    };

    searchResults.forEach(result => {
      if (result.type === 'metric') {
        groups.metrics.push(result);
      } else if (result.type === 'page') {
        groups.pages.push(result);
      } else if (result.type === 'feature') {
        groups.features.push(result);
      }
    });

    return groups;
  }, [searchResults]);

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch?.(value);
    if (value.trim()) {
      setIsOpen(true);
    }
  };

  const clearSearch = () => {
    setQuery('');
    onSearch?.('');
    setIsOpen(false);
  };

  const handleResultClick = (url: string) => {
    navigate(url);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      handleResultClick(searchResults[0].url);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const recentSearches = [
    'Cadence',
    'Equilibrium',
    'Gait Score',
    'Analytics',
  ];

  const hasResults = searchResults.length > 0;
  const showRecentSearches = !query.trim() && !hasResults;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10 bg-sidebar/50 border-sidebar-border focus:bg-background transition-colors"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        {showRecentSearches ? (
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
              Recent Searches
            </div>
            {recentSearches.map((search, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleSearch(search);
                }}
                className="w-full justify-start text-sm font-normal"
              >
                <SearchIcon className="h-3 w-3 mr-2" />
                {search}
              </Button>
            ))}
          </div>
        ) : hasResults ? (
          <ScrollArea className="h-96">
            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-2">
                Search Results ({searchResults.length})
              </div>
              
              {/* Metrics Section */}
              {groupedResults.metrics.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-1">
                    Metrics
                  </div>
                  {groupedResults.metrics.map((result) => (
                    <Button
                      key={result.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResultClick(result.url)}
                      className="w-full justify-start text-sm font-normal h-auto py-2 px-2 hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="mt-0.5 text-primary">
                          {result.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-foreground">{result.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {result.description}
                          </div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </Button>
                  ))}
                </div>
              )}

              {/* Pages Section */}
              {groupedResults.pages.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-1">
                    Pages
                  </div>
                  {groupedResults.pages.map((result) => (
                    <Button
                      key={result.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResultClick(result.url)}
                      className="w-full justify-start text-sm font-normal h-auto py-2 px-2 hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="mt-0.5 text-primary">
                          {result.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-foreground">{result.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {result.description}
                          </div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </Button>
                  ))}
                </div>
              )}

              {/* Features Section */}
              {groupedResults.features.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-1">
                    Features
                  </div>
                  {groupedResults.features.map((result) => (
                    <Button
                      key={result.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResultClick(result.url)}
                      className="w-full justify-start text-sm font-normal h-auto py-2 px-2 hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="mt-0.5 text-primary">
                          {result.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-foreground">{result.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {result.description}
                          </div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : query.trim() ? (
          <div className="p-8 text-center">
            <SearchIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">Try searching for "cadence", "equilibrium", or "analytics"</p>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
