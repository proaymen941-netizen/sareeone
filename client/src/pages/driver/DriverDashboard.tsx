import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, 
  MapPin, 
  Clock, 
  DollarSign, 
  LogOut,
  Navigation,
  Phone,
  CheckCircle,
  XCircle,
  Package,
  Settings,
  TrendingUp,
  Activity,
  Map,
  Bell,
  User,
  Calendar,
  Target,
  Menu,
  X,
  Home,
  ClipboardList,
  BarChart3,
  MapPinHouse
} from 'lucide-react';
import type { Order, Driver } from '@shared/schema';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const driverId = 'driver1';

  // Fetch driver info
  const { data: driver } = useQuery<Driver>({
    queryKey: [`/api/drivers/${driverId}`],
  });

  // Fetch available orders
  const { data: availableOrders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: [`/api/drivers/${driverId}/available-orders`],
    refetchInterval: 10000,
  });

  // Fetch driver orders
  const { data: myOrders } = useQuery<Order[]>({
    queryKey: [`/api/drivers/${driverId}/orders`],
  });

  // Fetch driver stats
  const { data: todayStats } = useQuery({
    queryKey: [`/api/drivers/${driverId}/stats`, 'today'],
    queryFn: () => fetch(`/api/drivers/${driverId}/stats?period=today`).then(res => res.json()),
  });

  const { data: weekStats } = useQuery({
    queryKey: [`/api/drivers/${driverId}/stats`, 'week'],
    queryFn: () => fetch(`/api/drivers/${driverId}/stats?period=week`).then(res => res.json()),
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/drivers/${driverId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng
        }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}`] });
      toast({ title: 'تم تحديث الحالة بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في تحديث الحالة', variant: 'destructive' });
    },
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/drivers/${driverId}/accept-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!response.ok) throw new Error('Failed to accept order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/available-orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/orders`] });
      setDriverStatus('busy');
      toast({ title: 'تم قبول الطلب بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في قبول الطلب', variant: 'destructive' });
    },
  });

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/drivers/${driverId}/complete-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (!response.ok) throw new Error('Failed to complete order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/drivers/${driverId}/stats`] });
      setDriverStatus('available');
      toast({ title: 'تم تسليم الطلب بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في تسليم الطلب', variant: 'destructive' });
    },
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('خطأ في الحصول على الموقع:', error);
        }
      );
    }
  }, []);

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const toggleStatus = () => {
    const newStatus = driverStatus === 'available' ? 'offline' : 'available';
    setDriverStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toFixed(2)} ريال`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700 border-green-200';
      case 'busy': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'offline': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'متاح';
      case 'busy': return 'مشغول';
      case 'offline': return 'غير متاح';
      default: return 'غير معروف';
    }
  };

  const currentOrder = myOrders?.find(order => 
    order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready'
  );

  const navigationItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'available-orders', label: 'الطلبات الجديدة', icon: Bell, badge: availableOrders?.length },
    { id: 'my-orders', label: 'طلباتي', icon: ClipboardList },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'map', label: 'الخريطة', icon: MapPinHouse },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">طلبات اليوم</p>
                      <p className="text-xl font-bold text-gray-900">{todayStats?.totalOrders || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">أرباح اليوم</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(todayStats?.totalEarnings || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">أرباح الأسبوع</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(weekStats?.totalEarnings || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-orange-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Activity className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">الحالة</p>
                      <p className="text-lg font-bold text-gray-900">{getStatusText(driverStatus)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Order */}
            {currentOrder && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800 text-lg">
                    <Package className="h-5 w-5" />
                    الطلب الحالي - #{currentOrder.id}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="font-medium text-gray-700">معلومات العميل</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          {currentOrder.customerPhone}
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{currentOrder.deliveryAddress}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-gray-700">تفاصيل الطلب</p>
                        <p className="text-sm text-gray-600">المجموع: {formatCurrency(currentOrder.totalAmount)}</p>
                        <p className="text-sm text-gray-600">رسوم التوصيل: {formatCurrency(currentOrder.deliveryFee)}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => window.open(`https://maps.google.com/?q=${currentOrder.deliveryAddress}`, '_blank')}
                        className="gap-2 flex-1"
                        variant="outline"
                      >
                        <Navigation className="h-4 w-4" />
                        التنقل
                      </Button>
                      <Button
                        onClick={() => window.open(`tel:${currentOrder.customerPhone}`, '_self')}
                        className="gap-2 flex-1"
                        variant="outline"
                      >
                        <Phone className="h-4 w-4" />
                        اتصال
                      </Button>
                      <Button
                        onClick={() => completeOrderMutation.mutate(currentOrder.id)}
                        disabled={completeOrderMutation.isPending}
                        className="gap-2 bg-green-600 hover:bg-green-700 flex-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        تم التسليم
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'available-orders':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                الطلبات المتاحة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !availableOrders || availableOrders.length === 0 ? (
                <div className="text-center p-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد طلبات متاحة حالياً</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableOrders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 mb-3 sm:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-gray-900">طلب #{order.id}</p>
                          <Badge variant="outline" className="text-xs">
                            جديد
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="flex-1">{order.deliveryAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatDate(order.createdAt.toString())}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="text-right sm:text-left">
                          <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</p>
                          <p className="text-sm text-green-600">
                            رسوم: {formatCurrency(order.deliveryFee)}
                          </p>
                        </div>
                        <Button
                          onClick={() => acceptOrderMutation.mutate(order.id)}
                          disabled={acceptOrderMutation.isPending || driverStatus !== 'available'}
                          className="gap-2 bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          قبول
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'my-orders':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">طلباتي</CardTitle>
            </CardHeader>
            <CardContent>
              {myOrders && myOrders.length > 0 ? (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1 mb-3 sm:mb-0">
                        <p className="font-medium text-gray-900">طلب #{order.id}</p>
                        <p className="text-sm text-gray-600 mt-1">{order.deliveryAddress}</p>
                        <p className="text-sm text-gray-500">{formatDate(order.createdAt.toString())}</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Badge 
                          variant={order.status === 'delivered' ? 'default' : 'secondary'}
                          className={order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                        >
                          {order.status === 'delivered' ? 'مكتمل' : 'قيد التنفيذ'}
                        </Badge>
                        <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد طلبات</p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'stats':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    إحصائيات اليوم
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">إجمالي الطلبات:</span>
                    <span className="font-bold text-gray-900">{todayStats?.totalOrders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">إجمالي الأرباح:</span>
                    <span className="font-bold text-green-600">{formatCurrency(todayStats?.totalEarnings || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">متوسط الطلب:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(todayStats?.avgOrderValue || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    إحصائيات الأسبوع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">إجمالي الطلبات:</span>
                    <span className="font-bold text-gray-900">{weekStats?.totalOrders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">إجمالي الأرباح:</span>
                    <span className="font-bold text-green-600">{formatCurrency(weekStats?.totalEarnings || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">متوسط الطلب:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(weekStats?.avgOrderValue || 0)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'map':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPinHouse className="h-5 w-5" />
                خريطة التوصيل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center p-4">
                <Map className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-gray-500 text-center mb-2">خريطة تفاعلية - قريباً</p>
                <p className="text-gray-400 text-sm text-center">سيتم دمج الخرائط الحية لتتبع الطلبات والمواقع</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                الملف الشخصي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{driver?.name || 'أحمد محمد'}</h3>
                    <p className="text-gray-600">سائق توصيل</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">رقم الهاتف:</span>
                    <span className="font-medium text-gray-900">{driver?.phone || '0501234567'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">الحالة:</span>
                    <Badge className={getStatusColor(driverStatus)}>
                      {getStatusText(driverStatus)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600">متاح للعمل:</span>
                    <span className="font-medium text-gray-900">{driver?.isAvailable ? 'نعم' : 'لا'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-l border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="font-bold text-gray-900">تطبيق السائق</h1>
              <p className="text-xs text-gray-500">{driver?.name || 'أحمد محمد'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-green-50 text-green-700 border-r-2 border-green-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-right">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge className="bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Button 
            onClick={toggleStatus}
            className={`w-full gap-2 ${
              driverStatus === 'available' 
                ? 'bg-gray-600 hover:bg-gray-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={updateStatusMutation.isPending}
          >
            {driverStatus === 'available' ? (
              <>
                <XCircle className="h-4 w-4" />
                إيقاف العمل
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                بدء العمل
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full gap-2 mt-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Truck className="h-8 w-8 text-green-600" />
                <div>
                  <h1 className="font-bold text-gray-900">تطبيق السائق</h1>
                  <p className="text-xs text-gray-500">{driver?.name || 'أحمد محمد'}</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-green-50 text-green-700 border-r-2 border-green-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-right">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge className="bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:mr-64 flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Truck className="h-6 w-6 text-green-600" />
                  <span className="font-bold text-gray-900">تطبيق السائق</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(driverStatus)}>
                  {getStatusText(driverStatus)}
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};
