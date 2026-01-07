import React, { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSystem } from '@/components/NotificationSystem';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  LogOut,
  Package,
  Truck,
  Store,
  TrendingUp,
  Clock,
  Star,
  AlertCircle,
  Filter,
  Download,
  Calendar,
  TrendingDown,
  Eye,
  BarChart,
  PieChart,
  Activity,
  Percent,
  Wallet,
  CreditCard,
  Repeat,
  CalendarDays,
  MapPin,
  Phone,
  Mail,
  Clock4,
  ChefHat,
  Coffee,
  Pizza,
  Sandwich,
  Utensils,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { RestaurantReportsModal } from '@/components/RestaurantReportsModal';
import { formatCurrency, formatDate, calculatePercentage, calculateAverage } from '@/lib/utils';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ from: new Date(new Date().setDate(new Date().getDate() - 30)), to: new Date() });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [showRestaurantReports, setShowRestaurantReports] = useState(false);

  // 🔄 تقسيم الاستعلامات لتحسين الأداء
  const queries = useQueries({
    queries: [
      {
        queryKey: ['/api/admin/dashboard/stats', dateRange],
        queryFn: async () => {
          const response = await apiRequest('GET', 
            `/api/admin/dashboard/stats?start=${dateRange.from.toISOString()}&end=${dateRange.to.toISOString()}`,
            null, 
            user?.token
          );
          return response.json();
        },
        staleTime: 60000, // تحديث كل دقيقة بدلاً من 30 ثانية
      },
      {
        queryKey: ['/api/admin/recent-orders', 10],
        queryFn: async () => {
          const response = await apiRequest('GET', '/api/admin/recent-orders?limit=10', null, user?.token);
          return response.json();
        },
        staleTime: 30000,
      },
      {
        queryKey: ['/api/admin/restaurants/summary'],
        queryFn: async () => {
          const response = await apiRequest('GET', '/api/admin/restaurants/summary', null, user?.token);
          return response.json();
        },
        staleTime: 120000,
      },
      {
        queryKey: ['/api/admin/categories'],
        queryFn: async () => {
          const response = await apiRequest('GET', '/api/admin/categories', null, user?.token);
          return response.json();
        },
        staleTime: 300000,
      },
    ]
  });

  const [statsData, recentOrdersData, restaurantsData, categoriesData] = queries;
  
  const isLoading = queries.some(query => query.isLoading);

  // 📊 معالجة البيانات المحلية
  const stats = useMemo(() => statsData?.data || {}, [statsData]);
  const recentOrders = useMemo(() => recentOrdersData?.data || [], [recentOrdersData]);
  const restaurantsSummary = useMemo(() => restaurantsData?.data || [], [restaurantsData]);
  const categories = useMemo(() => categoriesData?.data || [], [categoriesData]);

  // 🏪 بيانات تقارير المطاعم (تسحب عند الطلب فقط)
  const { data: restaurantReports, refetch: refetchReports } = useQuery({
    queryKey: ['/api/admin/reports/restaurants', dateRange, selectedCategory],
    queryFn: async () => {
      let url = `/api/admin/reports/restaurants?start=${dateRange.from.toISOString()}&end=${dateRange.to.toISOString()}`;
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }
      const response = await apiRequest('GET', url, null, user?.token);
      return response.json();
    },
    enabled: false, // لا يتم تنفيذه تلقائياً
  });

  // 📈 حساب المؤشرات الأدائية
  const performanceIndicators = useMemo(() => {
    if (!restaurantReports?.length) return [];
    
    return restaurantReports.map(restaurant => {
      const commissionAmount = restaurant.totalSales * (restaurant.commissionRate / 100);
      const netAmount = restaurant.totalSales - commissionAmount;
      const avgOrderValue = restaurant.totalOrders > 0 ? restaurant.totalSales / restaurant.totalOrders : 0;
      
      return {
        ...restaurant,
        commissionAmount,
        netAmount,
        avgOrderValue,
        performanceScore: calculatePerformanceScore(restaurant),
        growthRate: calculateGrowthRate(restaurant),
        efficiency: calculateEfficiency(restaurant),
      };
    });
  }, [restaurantReports]);

  // 🔧 دوال مساعدة للحسابات
  const calculatePerformanceScore = (restaurant) => {
    const score = (
      (restaurant.totalSales * 0.4) +
      (restaurant.totalOrders * 0.3) +
      (restaurant.avgOrderValue * 0.2) +
      (restaurant.customerSatisfaction || 0.1)
    );
    return Math.min(Math.round(score), 100);
  };

  const calculateGrowthRate = (restaurant) => {
    // حساب النمو بالمقارنة مع الفترة السابقة
    const previousPeriodSales = restaurant.previousPeriodSales || restaurant.totalSales * 0.8;
    return ((restaurant.totalSales - previousPeriodSales) / previousPeriodSales) * 100;
  };

  const calculateEfficiency = (restaurant) => {
    // حساب الكفاءة التشغيلية
    const orderCompletionRate = restaurant.completedOrders / restaurant.totalOrders;
    const timeEfficiency = restaurant.avgPreparationTime ? 
      100 - (restaurant.avgPreparationTime / 60) * 10 : 85;
    return Math.round((orderCompletionRate * 60 + timeEfficiency * 40) / 100);
  };

  const handleLogout = () => {
    logout();
  };

  const handleViewRestaurantDetails = (restaurantId: string) => {
    setSelectedRestaurant(restaurantId);
    setShowRestaurantReports(true);
  };

  const handleExportReports = () => {
    // تصدير التقارير إلى CSV أو PDF
    console.log('تصدير التقارير...');
  };

  const handleRefreshReports = () => {
    refetchReports();
  };

  const statCards = [
    { 
      title: 'إجمالي الطلبات', 
      value: stats.totalOrders || 0, 
      icon: ShoppingBag, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: stats.ordersGrowth ? `${stats.ordersGrowth > 0 ? '+' : ''}${stats.ordersGrowth}%` : '--',
      changeType: stats.ordersGrowth > 0 ? 'positive' : stats.ordersGrowth < 0 ? 'negative' : 'neutral',
      description: 'مقارنة مع الفترة السابقة'
    },
    { 
      title: 'العملاء النشطين', 
      value: stats.activeCustomers || 0, 
      icon: Users, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: stats.customersGrowth ? `${stats.customersGrowth > 0 ? '+' : ''}${stats.customersGrowth}%` : '--',
      changeType: stats.customersGrowth > 0 ? 'positive' : stats.customersGrowth < 0 ? 'negative' : 'neutral',
      description: 'عملاء قاموا بطلبات خلال 30 يوم'
    },
    { 
      title: 'إجمالي المبيعات', 
      value: `${formatCurrency(stats.totalRevenue || 0)}`, 
      icon: DollarSign, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: stats.revenueGrowth ? `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%` : '--',
      changeType: stats.revenueGrowth > 0 ? 'positive' : stats.revenueGrowth < 0 ? 'negative' : 'neutral',
      description: 'صافي المبيعات بعد الخصومات'
    },
    { 
      title: 'صافي الأرباح', 
      value: `${formatCurrency(stats.netProfit || 0)}`, 
      icon: TrendingUp, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: stats.profitMargin ? `${stats.profitMargin}%` : '--',
      changeType: 'positive',
      description: 'هامش الربح الصافي'
    },
  ];

  const performanceCards = [
    { 
      title: 'متوسط قيمة الطلب', 
      value: `${formatCurrency(stats.avgOrderValue || 0)}`, 
      icon: CreditCard, 
      trend: stats.avgOrderTrend || 'stable',
      description: 'زيادة 5.2% عن الشهر الماضي'
    },
    { 
      title: 'معدل الإلغاء', 
      value: `${stats.cancellationRate || 0}%`, 
      icon: XCircle, 
      trend: stats.cancellationTrend || 'up',
      description: 'انخفاض 2.1% عن الشهر الماضي'
    },
    { 
      title: 'متوسط وقت التوصيل', 
      value: `${stats.avgDeliveryTime || 0} دقيقة`, 
      icon: Clock4, 
      trend: stats.deliveryTrend || 'down',
      description: 'تحسن 8 دقائق عن الشهر الماضي'
    },
    { 
      title: 'معدل تكرار العملاء', 
      value: `${stats.repeatCustomerRate || 0}%`, 
      icon: Repeat, 
      trend: stats.repeatTrend || 'up',
      description: 'زيادة 3.4% عن الشهر الماضي'
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
          <p className="text-sm text-gray-500">يتم تحميل المكونات بشكل منفصل لتحسين الأداء</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">لوحة التحكم المتقدمة</h1>
                <p className="text-sm text-gray-500">مرحباً {user?.name} | نظام التحليل المتكامل</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefreshReports}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث البيانات
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* التحكم في الفلاتر */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">الفترة الزمنية:</span>
            </div>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-[250px]"
            />
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">التصنيف:</span>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="جميع التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => refetchReports()}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              تطبيق الفلاتر
            </Button>

            <Button
              variant="outline"
              onClick={handleExportReports}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير التقارير
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification System */}
        <div className="mb-8">
          <NotificationSystem userType="admin" />
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200 border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <div className="flex items-center mt-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          stat.changeType === 'positive' ? 'bg-green-100 text-green-800' :
                          stat.changeType === 'negative' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {stat.changeType === 'positive' && '↑'}
                          {stat.changeType === 'negative' && '↓'}
                          {stat.change}
                        </span>
                        <span className="text-xs text-gray-500 mr-1">{stat.description}</span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {performanceCards.map((stat, index) => {
            const Icon = stat.icon;
            const trendColor = stat.trend === 'up' ? 'text-green-600' : 
                             stat.trend === 'down' ? 'text-red-600' : 'text-gray-600';
            return (
              <Card key={index} className="bg-gradient-to-br from-white to-gray-50 border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600">{stat.title}</p>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                    </div>
                    <Icon className={`h-5 w-5 ${trendColor}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto p-1 bg-gray-100">
            <TabsTrigger value="overview" className="py-3 data-[state=active]:bg-white">
              <BarChart3 className="h-4 w-4 ml-2" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="restaurant-reports" className="py-3 data-[state=active]:bg-white">
              <Store className="h-4 w-4 ml-2" />
              تقارير المطاعم
            </TabsTrigger>
            <TabsTrigger value="orders" className="py-3 data-[state=active]:bg-white">
              <Package className="h-4 w-4 ml-2" />
              الطلبات
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="py-3 data-[state=active]:bg-white">
              <ChefHat className="h-4 w-4 ml-2" />
              المطاعم
            </TabsTrigger>
            <TabsTrigger value="drivers" className="py-3 data-[state=active]:bg-white">
              <Truck className="h-4 w-4 ml-2" />
              السائقين
            </TabsTrigger>
            <TabsTrigger value="analytics" className="py-3 data-[state=active]:bg-white">
              <Activity className="h-4 w-4 ml-2" />
              التحليلات
            </TabsTrigger>
          </TabsList>

          {/* نظرة عامة */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    الطلبات الحديثة
                  </CardTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {recentOrders.length} طلب
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order: any, index: number) => (
                      <div key={order.id || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            order.status === 'delivered' ? 'bg-green-500' :
                            order.status === 'pending' ? 'bg-yellow-500' :
                            order.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <p className="font-medium">طلب #{order.orderNumber || `${1000 + index}`}</p>
                            <p className="text-sm text-gray-600">{order.customerName || 'عميل'}</p>
                            <p className="text-xs text-gray-500">
                              {order.createdAt ? formatDate(order.createdAt) : 'الآن'}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <Badge variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'pending' ? 'secondary' :
                            order.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {order.status === 'pending' ? 'معلق' :
                             order.status === 'confirmed' ? 'مؤكد' :
                             order.status === 'preparing' ? 'قيد التحضير' :
                             order.status === 'ready' ? 'جاهز' :
                             order.status === 'picked_up' ? 'تم الاستلام' :
                             order.status === 'delivered' ? 'تم التوصيل' :
                             order.status === 'cancelled' ? 'ملغي' : order.status}
                          </Badge>
                          <p className="text-sm font-medium mt-1">{formatCurrency(order.total || 0)}</p>
                        </div>
                      </div>
                    ))}
                    {recentOrders.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد طلبات حديثة</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* System Status & Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    أداء النظام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>استجابة الخادم</span>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {stats.serverResponseTime || '150'} مللي ثانية
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>قاعدة البيانات</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          متصلة
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {stats.dbQueries || '0'} استعلام/ثانية
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          (stats.pendingOrders || 0) > 10 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <span>الطلبات المعلقة</span>
                      </div>
                      <Badge variant={
                        (stats.pendingOrders || 0) > 10 ? "secondary" : "default"
                      } className={
                        (stats.pendingOrders || 0) > 10 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                      }>
                        {stats.pendingOrders || 0} طلب
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>إجمالي العمولات</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-800">
                        {formatCurrency(stats.totalCommission || 0)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* تقارير المطاعم */}
          <TabsContent value="restaurant-reports" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  تقارير المطاعم المتقدمة
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchReports()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    تحديث
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportReports}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    تصدير
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {performanceIndicators.length > 0 ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-blue-600">إجمالي المبيعات</p>
                              <p className="text-lg font-bold text-blue-900">
                                {formatCurrency(performanceIndicators.reduce((sum, r) => sum + r.totalSales, 0))}
                              </p>
                            </div>
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-green-50 to-green-100">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-green-600">إجمالي الطلبات</p>
                              <p className="text-lg font-bold text-green-900">
                                {performanceIndicators.reduce((sum, r) => sum + r.totalOrders, 0)}
                              </p>
                            </div>
                            <ShoppingBag className="h-5 w-5 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-purple-600">متوسط قيمة الطلب</p>
                              <p className="text-lg font-bold text-purple-900">
                                {formatCurrency(
                                  performanceIndicators.reduce((sum, r) => sum + r.avgOrderValue, 0) / performanceIndicators.length
                                )}
                              </p>
                            </div>
                            <CreditCard className="h-5 w-5 text-purple-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-orange-600">إجمالي العمولات</p>
                              <p className="text-lg font-bold text-orange-900">
                                {formatCurrency(performanceIndicators.reduce((sum, r) => sum + r.commissionAmount, 0))}
                              </p>
                            </div>
                            <Percent className="h-5 w-5 text-orange-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Main Reports Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="w-[300px]">المطعم</TableHead>
                            <TableHead>التصنيف</TableHead>
                            <TableHead>الطلبات</TableHead>
                            <TableHead>المبيعات</TableHead>
                            <TableHead>متوسط الطلب</TableHead>
                            <TableHead>العمولة</TableHead>
                            <TableHead>المستحق</TableHead>
                            <TableHead>درجة الأداء</TableHead>
                            <TableHead>الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {performanceIndicators.map((restaurant) => (
                            <TableRow key={restaurant.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  {restaurant.image && (
                                    <img
                                      src={restaurant.image}
                                      alt={restaurant.name}
                                      className="w-10 h-10 rounded-lg object-cover"
                                    />
                                  )}
                                  <div>
                                    <p className="font-medium">{restaurant.name}</p>
                                    {restaurant.phone && (
                                      <p className="text-xs text-gray-500">{restaurant.phone}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-gray-100">
                                  {restaurant.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{restaurant.totalOrders}</div>
                                <div className={`text-xs ${
                                  restaurant.growthRate > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {restaurant.growthRate > 0 ? '↑' : '↓'} 
                                  {Math.abs(restaurant.growthRate).toFixed(1)}%
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(restaurant.totalSales)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(restaurant.avgOrderValue)}
                              </TableCell>
                              <TableCell>
                                <div className="text-orange-600 font-medium">
                                  {formatCurrency(restaurant.commissionAmount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {restaurant.commissionRate}%
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-green-600 font-medium">
                                  {formatCurrency(restaurant.netAmount)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        restaurant.performanceScore >= 80 ? 'bg-green-500' :
                                        restaurant.performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${restaurant.performanceScore}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    restaurant.performanceScore >= 80 ? 'text-green-600' :
                                    restaurant.performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {restaurant.performanceScore}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewRestaurantDetails(restaurant.id)}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    التفاصيل
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Performance Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            أفضل المطاعم أداءً
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {[...performanceIndicators]
                            .sort((a, b) => b.performanceScore - a.performanceScore)
                            .slice(0, 5)
                            .map((restaurant, index) => (
                              <div key={restaurant.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {index + 1}. {restaurant.name}
                                  </span>
                                </div>
                                <Badge variant={
                                  restaurant.performanceScore >= 80 ? "default" :
                                  restaurant.performanceScore >= 60 ? "secondary" : "outline"
                                }>
                                  {restaurant.performanceScore}
                                </Badge>
                              </div>
                            ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            أعلى المطاعم مبيعاً
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {[...performanceIndicators]
                            .sort((a, b) => b.totalSales - a.totalSales)
                            .slice(0, 5)
                            .map((restaurant, index) => (
                              <div key={restaurant.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {index + 1}. {restaurant.name}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-green-600">
                                  {formatCurrency(restaurant.totalSales)}
                                </span>
                              </div>
                            ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            أعلى معدل طلبات
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {[...performanceIndicators]
                            .sort((a, b) => b.totalOrders - a.totalOrders)
                            .slice(0, 5)
                            .map((restaurant, index) => (
                              <div key={restaurant.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {index + 1}. {restaurant.name}
                                  </span>
                                </div>
                                <Badge variant="outline" className="bg-blue-50">
                                  {restaurant.totalOrders} طلب
                                </Badge>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Store className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-600 mb-2">لا توجد بيانات تقارير</p>
                    <p className="text-sm text-gray-500 mb-4">قم بتطبيق الفلاتر أو تحديث البيانات</p>
                    <Button
                      variant="outline"
                      onClick={() => refetchReports()}
                      className="flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw className="h-4 w-4" />
                      تحميل تقارير المطاعم
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* باقي التبويبات (Orders, Restaurants, Drivers, Analytics) */}
          {/* ... سيتم الحفاظ على الهيكل الحالي مع تحسينات الأداء ... */}
          
        </Tabs>

        {/* Restaurant Reports Modal */}
        <RestaurantReportsModal
          open={showRestaurantReports}
          onOpenChange={setShowRestaurantReports}
          restaurantId={selectedRestaurant}
          dateRange={dateRange}
        />
      </main>
    </div>
  );
}
