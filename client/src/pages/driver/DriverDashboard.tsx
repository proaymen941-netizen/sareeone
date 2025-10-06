import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Bell,
  User,
  Calendar,
  Target,
  AlertCircle,
  RefreshCw,
  Eye,
  MessageCircle,
  Store,
  Map,
  TrendingUp,
  Activity
} from 'lucide-react';
import type { Order, Driver } from '@shared/schema';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('available');
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>('offline');
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);

  // الحصول على معرف السائق من localStorage
  const getDriverId = () => {
    const driverUser = localStorage.getItem('driver_user');
    if (driverUser) {
      try {
        const user = JSON.parse(driverUser);
        return user.id;
      } catch (error) {
        console.error('خطأ في تحليل بيانات السائق:', error);
        return null;
      }
    }
    return null;
  };

  const driverId = getDriverId();

  // التحقق من تسجيل الدخول عند تحميل المكون
  useEffect(() => {
    if (!driverId) {
      window.location.href = '/driver-login';
      return;
    }

    try {
      const savedDriver = localStorage.getItem('driver_user');
      if (savedDriver) {
        const driver = JSON.parse(savedDriver);
        setCurrentDriver(driver);
        setDriverStatus(driver.isAvailable ? 'available' : 'offline');
      }
    } catch (error) {
      console.error('خطأ في تحليل بيانات السائق:', error);
      handleLogout();
    }
  }, [driverId]);

  // جلب الطلبات المتاحة (غير مُعيَّنة لسائق)
  const { data: availableOrders = [], isLoading: availableLoading, refetch: refetchAvailable } = useQuery<Order[]>({
    queryKey: ['/api/orders', { status: 'confirmed', available: true }],
    queryFn: async () => {
      const response = await fetch('/api/orders?status=confirmed&available=true');
      if (!response.ok) throw new Error('فشل في جلب الطلبات المتاحة');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!driverId && driverStatus === 'available',
    refetchInterval: 5000, // تحديث كل 5 ثوانِ
  });

  // جلب طلبات السائق الحالية
  const { data: myOrders = [], isLoading: myOrdersLoading, refetch: refetchMyOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders', { driverId }],
    queryFn: async () => {
      if (!driverId) return [];
      const response = await fetch(`/api/orders?driverId=${driverId}`);
      if (!response.ok) throw new Error('فشل في جلب طلباتي');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!driverId,
    refetchInterval: 3000, // تحديث كل 3 ثوانِ
  });

  // جلب إحصائيات السائق
  const { data: todayStats } = useQuery({
    queryKey: ['/api/drivers', driverId, 'stats', 'today'],
    queryFn: async () => {
      if (!driverId) return null;
      const response = await fetch(`/api/drivers/${driverId}/stats?period=today`);
      if (!response.ok) return { totalOrders: 0, totalEarnings: 0, completedOrders: 0, avgOrderValue: 0 };
      return response.json();
    },
    enabled: !!driverId,
  });

  const { data: weekStats } = useQuery({
    queryKey: ['/api/drivers', driverId, 'stats', 'week'],
    queryFn: async () => {
      if (!driverId) return null;
      const response = await fetch(`/api/drivers/${driverId}/stats?period=week`);
      if (!response.ok) return { totalOrders: 0, totalEarnings: 0, completedOrders: 0, avgOrderValue: 0 };
      return response.json();
    },
    enabled: !!driverId,
  });

  // قبول طلب
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!driverId) throw new Error('معرف السائق غير موجود');
      
      const response = await fetch(`/api/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في قبول الطلب');
      }
      
      return response.json();
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', driverId, 'stats'] });
      setDriverStatus('busy');
      
      toast({
        title: "تم قبول الطلب بنجاح ✅",
        description: `تم تعيين الطلب ${orderId.slice(0, 8)} لك`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في قبول الطلب",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // تحديث حالة الطلب
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          updatedBy: driverId,
          updatedByType: 'driver'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في تحديث حالة الطلب');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', driverId, 'stats'] });
      
      if (variables.status === 'delivered') {
        setDriverStatus('available');
        updateDriverStatusMutation.mutate(true);
      }
      
      const statusText = getStatusText(variables.status);
      toast({
        title: "تم تحديث حالة الطلب ✅",
        description: `تم تحديث الطلب إلى: ${statusText}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الطلب",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // تحديث حالة السائق
  const updateDriverStatusMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      if (!driverId) throw new Error('معرف السائق غير موجود');
      
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      
      if (!response.ok) throw new Error('فشل في تحديث حالة السائق');
      return response.json();
    },
    onSuccess: (data, isAvailable) => {
      setDriverStatus(isAvailable ? 'available' : 'offline');
      
      if (currentDriver) {
        const updatedDriver = { ...currentDriver, isAvailable };
        setCurrentDriver(updatedDriver);
        localStorage.setItem('driver_user', JSON.stringify(updatedDriver));
      }
      
      toast({
        title: isAvailable ? "أنت متاح الآن 🟢" : "أنت غير متاح 🔴",
        description: isAvailable ? "ستتلقى طلبات جديدة" : "لن تتلقى طلبات جديدة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // مراقبة الطلبات الجديدة للإشعارات
  useEffect(() => {
    if (availableOrders.length > 0 && driverStatus === 'available') {
      const latestOrderTime = Math.max(...availableOrders.map(order => 
        new Date(order.createdAt).getTime()
      ));
      
      if (latestOrderTime > lastNotificationTime) {
        setLastNotificationTime(latestOrderTime);
        
        // إشعار صوتي ومرئي
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('طلب جديد متاح! 🔔', {
            body: `يوجد ${availableOrders.length} طلب متاح للتوصيل`,
            icon: '/logo.png',
            tag: 'new-order'
          });
        }
        
        toast({
          title: "طلب جديد متاح! 🔔",
          description: `يوجد ${availableOrders.length} طلب جديد متاح للتوصيل`,
        });
      }
    }
  }, [availableOrders, driverStatus, lastNotificationTime, toast]);

  // طلب إذن الإشعارات
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    onLogout();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للاستلام',
      picked_up: 'تم الاستلام',
      on_way: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      on_way: 'bg-green-100 text-green-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'picked_up',
      picked_up: 'on_way',
      on_way: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels: Record<string, string> = {
      confirmed: 'بدء التحضير',
      preparing: 'جاهز للاستلام',
      ready: 'تم الاستلام',
      picked_up: 'في الطريق',
      on_way: 'تم التسليم'
    };
    return labels[currentStatus] || 'تحديث الحالة';
  };

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  const formatCurrency = (amount: string | number) => {
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

  // فتح خرائط جوجل للمطعم
  const openRestaurantLocation = (order: Order) => {
    const restaurantLat = 15.3694;
    const restaurantLng = 44.1910;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurantLat},${restaurantLng}`;
    window.open(url, '_blank');
  };

  // فتح خرائط جوجل للعميل
  const openCustomerLocation = (order: Order) => {
    if (order.customerLocationLat && order.customerLocationLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${order.customerLocationLat},${order.customerLocationLng}`;
      window.open(url, '_blank');
    } else {
      const encodedAddress = encodeURIComponent(order.deliveryAddress);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(url, '_blank');
    }
  };

  // عرض تفاصيل الطلب
  const handleShowOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailsDialog(true);
  };

  // تصنيف الطلبات حسب الحالة
  const categorizeOrders = (orders: Order[]) => {
    return {
      available: orders.filter(order => 
        order.status === 'confirmed' && !order.driverId
      ),
      accepted: orders.filter(order => 
        order.driverId === driverId && 
        ['preparing', 'ready'].includes(order.status || '')
      ),
      inProgress: orders.filter(order => 
        order.driverId === driverId && 
        ['picked_up', 'on_way'].includes(order.status || '')
      ),
      completed: orders.filter(order => 
        order.driverId === driverId && 
        order.status === 'delivered'
      )
    };
  };

  const allOrders = [...availableOrders, ...myOrders];
  const categorizedOrders = categorizeOrders(allOrders);

  // مكون عرض الطلب
  const OrderCard = ({ order, type }: { order: Order; type: 'available' | 'accepted' | 'inProgress' | 'completed' }) => {
    const items = getOrderItems(order.items);
    const totalAmount = parseFloat(order.totalAmount || '0');
    const commission = parseFloat(order.driverEarnings || Math.round(totalAmount * 0.15).toString());

    return (
      <Card key={order.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-lg">طلب #{order.orderNumber || order.id.slice(0, 8)}</h4>
              <p className="text-sm text-muted-foreground">{order.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.createdAt.toString())}
              </p>
            </div>
            <div className="text-left">
              <Badge className={getStatusColor(order.status || 'pending')}>
                {getStatusText(order.status || 'pending')}
              </Badge>
              <div className="mt-2">
                <p className="font-bold text-lg text-green-600">{formatCurrency(totalAmount)}</p>
                <p className="text-sm text-muted-foreground">عمولة: {formatCurrency(commission)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* معلومات العميل */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">من: مطعم تجريبي</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{order.customerPhone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm">{order.deliveryAddress}</span>
            </div>
            {order.notes && (
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-blue-600">ملاحظات: {order.notes}</span>
              </div>
            )}
          </div>

          {/* تفاصيل الطلب */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium mb-2">تفاصيل الطلب:</h5>
            <div className="space-y-1">
              {items.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  و {items.length - 3} عنصر آخر...
                </p>
              )}
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2">
            {type === 'available' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleShowOrderDetails(order)}
                  className="gap-2"
                  data-testid={`view-details-${order.id}`}
                >
                  <Eye className="h-4 w-4" />
                  التفاصيل
                </Button>
                <Button
                  onClick={() => acceptOrderMutation.mutate(order.id)}
                  disabled={acceptOrderMutation.isPending || categorizedOrders.accepted.length > 0 || categorizedOrders.inProgress.length > 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid={`accept-order-${order.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  قبول الطلب
                </Button>
              </>
            )}

            {(type === 'accepted' || type === 'inProgress') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => openRestaurantLocation(order)}
                  className="gap-2"
                  data-testid={`restaurant-location-${order.id}`}
                >
                  <Store className="h-4 w-4" />
                  المطعم
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open(`tel:${order.customerPhone}`)}
                  className="gap-2"
                  data-testid={`call-customer-${order.id}`}
                >
                  <Phone className="h-4 w-4" />
                  اتصال
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => openCustomerLocation(order)}
                  className="gap-2"
                  data-testid={`navigate-${order.id}`}
                >
                  <Navigation className="h-4 w-4" />
                  التنقل
                </Button>

                {getNextStatus(order.status || '') && (
                  <Button
                    onClick={() => updateOrderStatusMutation.mutate({ 
                      orderId: order.id, 
                      status: getNextStatus(order.status || '') 
                    })}
                    disabled={updateOrderStatusMutation.isPending}
                    className="flex-1"
                    data-testid={`update-status-${order.id}`}
                  >
                    {getNextStatusLabel(order.status || '')}
                  </Button>
                )}
              </>
            )}

            {type === 'completed' && (
              <div className="flex-1 text-center">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  مكتمل
                </Badge>
              </div>
            )}
          </div>

          {(categorizedOrders.accepted.length > 0 || categorizedOrders.inProgress.length > 0) && type === 'available' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ لديك طلب نشط. أكمل التوصيل الحالي قبل قبول طلب جديد
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!driverId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">غير مصرح</h3>
            <p className="text-muted-foreground mb-4">يجب تسجيل الدخول كسائق</p>
            <Button onClick={onLogout}>
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">تطبيق السائق</h1>
                <p className="text-sm text-gray-500">مرحباً {currentDriver?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* مؤشر الطلبات الجديدة */}
              {categorizedOrders.available.length > 0 && driverStatus === 'available' && (
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full">
                  <Bell className="h-4 w-4 text-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-red-700">
                    {categorizedOrders.available.length} طلب جديد
                  </span>
                </div>
              )}

              {/* مؤشر التحديث التلقائي */}
              <div className="flex items-center gap-2 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>تحديث مباشر</span>
              </div>

              {/* حالة السائق */}
              <div className="flex items-center gap-2">
                <Label htmlFor="driver-status" className="text-sm">متاح للعمل</Label>
                <Switch
                  id="driver-status"
                  checked={driverStatus === 'available'}
                  onCheckedChange={(checked) => updateDriverStatusMutation.mutate(checked)}
                  disabled={updateDriverStatusMutation.isPending}
                  data-testid="driver-status-toggle"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchAvailable();
                  refetchMyOrders();
                }}
                disabled={availableLoading || myOrdersLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${availableLoading || myOrdersLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>

              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-2"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* إحصائيات سريعة */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-lg font-bold" data-testid="today-orders">{todayStats?.totalOrders || 0}</p>
              <p className="text-xs text-muted-foreground">طلبات اليوم</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-bold" data-testid="today-earnings">{formatCurrency(todayStats?.totalEarnings || 0)}</p>
              <p className="text-xs text-muted-foreground">أرباح اليوم</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-lg font-bold">{formatCurrency(weekStats?.totalEarnings || 0)}</p>
              <p className="text-xs text-muted-foreground">أرباح الأسبوع</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-lg font-bold">
                {driverStatus === 'available' ? '🟢 متاح' : 
                 driverStatus === 'busy' ? '🟡 مشغول' : '🔴 غير متاح'}
              </p>
              <p className="text-xs text-muted-foreground">الحالة الحالية</p>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available" className="relative">
              الطلبات المتاحة
              {categorizedOrders.available.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {categorizedOrders.available.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted" className="relative">
              طلباتي المقبولة
              {categorizedOrders.accepted.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {categorizedOrders.accepted.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inProgress" className="relative">
              قيد التوصيل
              {categorizedOrders.inProgress.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {categorizedOrders.inProgress.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              مكتملة
            </TabsTrigger>
          </TabsList>

          {/* الطلبات المتاحة */}
          <TabsContent value="available" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">الطلبات المتاحة ({categorizedOrders.available.length})</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAvailable()}
                disabled={availableLoading}
                data-testid="refresh-available-orders"
              >
                <RefreshCw className={`h-4 w-4 ${availableLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>

            {driverStatus !== 'available' && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-yellow-800">
                      يجب تفعيل حالة "متاح للعمل" لرؤية الطلبات الجديدة
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {availableLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : categorizedOrders.available.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات متاحة</h3>
                  <p className="text-muted-foreground">سيتم إشعارك عند توفر طلبات جديدة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {categorizedOrders.available.map(order => (
                  <OrderCard key={order.id} order={order} type="available" />
                ))}
              </div>
            )}
          </TabsContent>

          {/* الطلبات المقبولة */}
          <TabsContent value="accepted" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">طلباتي المقبولة ({categorizedOrders.accepted.length})</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchMyOrders()}
                disabled={myOrdersLoading}
              >
                <RefreshCw className={`h-4 w-4 ${myOrdersLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>

            {categorizedOrders.accepted.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات مقبولة</h3>
                  <p className="text-muted-foreground">الطلبات التي تقبلها ستظهر هنا</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {categorizedOrders.accepted.map(order => (
                  <OrderCard key={order.id} order={order} type="accepted" />
                ))}
              </div>
            )}
          </TabsContent>

          {/* الطلبات قيد التوصيل */}
          <TabsContent value="inProgress" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">قيد التوصيل ({categorizedOrders.inProgress.length})</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchMyOrders()}
                disabled={myOrdersLoading}
              >
                <RefreshCw className={`h-4 w-4 ${myOrdersLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>

            {categorizedOrders.inProgress.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات قيد التوصيل</h3>
                  <p className="text-muted-foreground">الطلبات التي تقوم بتوصيلها ستظهر هنا</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {categorizedOrders.inProgress.map(order => (
                  <OrderCard key={order.id} order={order} type="inProgress" />
                ))}
              </div>
            )}
          </TabsContent>

          {/* الطلبات المكتملة */}
          <TabsContent value="completed" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">الطلبات المكتملة</h2>
              <p className="text-sm text-muted-foreground">
                آخر 10 طلبات مكتملة
              </p>
            </div>

            {categorizedOrders.completed.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات مكتملة</h3>
                  <p className="text-muted-foreground">الطلبات المكتملة ستظهر هنا</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {categorizedOrders.completed.slice(0, 10).map(order => (
                  <OrderCard key={order.id} order={order} type="completed" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* إحصائيات إضافية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                إحصائيات اليوم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>إجمالي الطلبات:</span>
                <span className="font-bold">{todayStats?.totalOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>الطلبات المكتملة:</span>
                <span className="font-bold text-green-600">{todayStats?.completedOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>إجمالي الأرباح:</span>
                <span className="font-bold text-green-600">{formatCurrency(todayStats?.totalEarnings || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>متوسط الطلب:</span>
                <span className="font-bold">{formatCurrency(todayStats?.avgOrderValue || 0)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                إحصائيات الأسبوع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>إجمالي الطلبات:</span>
                <span className="font-bold">{weekStats?.totalOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>الطلبات المكتملة:</span>
                <span className="font-bold text-green-600">{weekStats?.completedOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>إجمالي الأرباح:</span>
                <span className="font-bold text-green-600">{formatCurrency(weekStats?.totalEarnings || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>متوسط الطلب:</span>
                <span className="font-bold">{formatCurrency(weekStats?.avgOrderValue || 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* نافذة تفاصيل الطلب */}
      <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">معلومات العميل</h4>
                  <p><strong>الاسم:</strong> {selectedOrder.customerName}</p>
                  <p><strong>الهاتف:</strong> {selectedOrder.customerPhone}</p>
                  <p><strong>العنوان:</strong> {selectedOrder.deliveryAddress}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">معلومات الطلب</h4>
                  <p><strong>رقم الطلب:</strong> {selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}</p>
                  <p><strong>الحالة:</strong> {getStatusText(selectedOrder.status || 'pending')}</p>
                  <p><strong>طريقة الدفع:</strong> {selectedOrder.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">تفاصيل العناصر</h4>
                <div className="border rounded-lg">
                  {getOrderItems(selectedOrder.items).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between p-3 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">× {item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">المجموع</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedOrder.totalAmount || '0')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">عمولة السائق</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(selectedOrder.driverEarnings || Math.round(parseFloat(selectedOrder.totalAmount || '0') * 0.15).toString())}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => acceptOrderMutation.mutate(selectedOrder.id)}
                  disabled={acceptOrderMutation.isPending || categorizedOrders.accepted.length > 0 || categorizedOrders.inProgress.length > 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  قبول الطلب
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetailsDialog(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;
