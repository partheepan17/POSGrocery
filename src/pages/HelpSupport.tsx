import React, { useState } from 'react';
import { ArrowLeft, Search, Phone, Mail, MessageCircle, BookOpen, Video, Download, ExternalLink, ChevronRight, HelpCircle, Settings, Bug, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function HelpSupport() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Topics', icon: BookOpen },
    { id: 'getting-started', name: 'Getting Started', icon: HelpCircle },
    { id: 'sales', name: 'Sales & Transactions', icon: Settings },
    { id: 'inventory', name: 'Inventory Management', icon: Settings },
    { id: 'reports', name: 'Reports & Analytics', icon: Settings },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: Bug },
    { id: 'contact', name: 'Contact Support', icon: MessageCircle }
  ];

  const helpArticles = [
    {
      id: 1,
      title: 'How to Process a Sale',
      category: 'sales',
      content: 'Learn how to process sales transactions, handle payments, and print receipts.',
      difficulty: 'beginner',
      readTime: '5 min'
    },
    {
      id: 2,
      title: 'Managing Inventory',
      category: 'inventory',
      content: 'Add products, update stock levels, and manage your inventory effectively.',
      difficulty: 'intermediate',
      readTime: '10 min'
    },
    {
      id: 3,
      title: 'Generating Reports',
      category: 'reports',
      content: 'Create and export sales reports, inventory reports, and financial summaries.',
      difficulty: 'intermediate',
      readTime: '8 min'
    },
    {
      id: 4,
      title: 'Setting Up Users and Permissions',
      category: 'getting-started',
      content: 'Configure user accounts, roles, and access permissions for your team.',
      difficulty: 'advanced',
      readTime: '15 min'
    },
    {
      id: 5,
      title: 'Troubleshooting Common Issues',
      category: 'troubleshooting',
      content: 'Resolve common problems with printing, connectivity, and system errors.',
      difficulty: 'beginner',
      readTime: '12 min'
    },
    {
      id: 6,
      title: 'Backup and Data Recovery',
      category: 'troubleshooting',
      content: 'Learn how to backup your data and recover from system failures.',
      difficulty: 'advanced',
      readTime: '20 min'
    }
  ];

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Help & Support
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get help with your POS system
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                        selectedCategory === category.id
                          ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Contact */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quick Contact
              </h3>
              <div className="space-y-3">
                <a
                  href="tel:+1234567890"
                  className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+1 (234) 567-8900</span>
                </a>
                <a
                  href="mailto:support@grocerypos.com"
                  className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">support@grocerypos.com</span>
                </a>
                <button className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Live Chat</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Articles */}
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {article.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {article.content}
                      </p>
                      <div className="flex items-center space-x-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getDifficultyColor(article.difficulty)
                        )}>
                          {article.difficulty}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {article.readTime} read
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {filteredArticles.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No articles found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search terms or browse different categories.
                </p>
              </div>
            )}

            {/* FAQ Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    How do I reset my password?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Contact your system administrator or use the password reset feature in the login screen.
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    How do I backup my data?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Go to Settings &gt; Data Management &gt; Backup to create a backup of your system data.
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    How do I add new products?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Navigate to Products &gt; Add Product to add new items to your inventory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
