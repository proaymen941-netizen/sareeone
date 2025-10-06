import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, MapPin, Clock, DollarSign, LogOut, Navigation, Phone, CircleCheck as CheckCircle, Circle as XCircle, Package, Settings, TrendingUp, Activity, Bell, User, Calendar, Target, RefreshCw } from 'lucide-react';
import type { Order, Driver } from '@shared/schema';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [driverStatus, setDriverStatus] = useState<boolean>(true);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);

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

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!driverId) {
      toast({
        title: "غير مصرح",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive"
      });
      onLogout();
      return;
    }

    // تحميل بيانات السائق من localStorage
    const savedDriver = localStorage.getItem('driver_user');
    if (savedDriver) {
      try {
        const driverData = JSON.parse(savedDriver);
        setCurrentDriver(driverData);
        setDriverStatus(driverData.isAvailable || true);
      } catch (error) {
        console.error('خطأ في تحميل بيانات السائق:', error);
      }
    }
  }, [driverId, onLogout, toast]);

  // جلب الطلبات المتاحة (غير المُعيَّنة لسائق)
  const { data: availableOrders, isLoading: ordersLoading, refetch: refetchAvailableOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders', { status: 'confirmed', available: true }],
    queryFn: async () => {
      const response = await fetch('/api/orders?status=confirmed&available=true');
      if (!response.ok) {
        throw new Error('فشل في جلب الطلبات المتاحة');
      }
      return response.json();
    },
    refetchInterval: 5000, // تحديث كل 5 ثوانِ
    enabled: !!driverId && driverStatus,
  });

  // جلب طلبات السائق الحالية
  const { data: myOrders, refetch: refetchMyOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders', { driverId }],
    queryFn: async () => {
      const response = await fetch(`/api/orders?driverId=${driverId}`);
      if (!response.ok) {
        throw new Error('فشل في جلب طلباتي');
      }
      return response.json();
    },
    refetchInterval: 3000, // تحديث كل 3 ثوانِ
    enabled: !!driverId,
  });

  // جلب إحصائيات السائق
  const { data: todayStats } = useQuery({
    queryKey: ['/api/drivers', driverId, 'stats', 'today'],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/${driverId}/stats?period=today`);
      if (!response.ok) {
        throw new Error('فشل في جلب إحصائيات اليوم');
      }
      return response.json();
    },
    enabled: !!driverId,
  });

  const { data: weekStats } = useQuery({
    queryKey: ['/api/drivers', driverId, 'stats', 'week'],
    queryFn: async () => {
      const response = await fetch(`/api/drivers/${driverId}/stats?period=week`);
      if (!response.ok) {
        throw new Error('فشل في جلب إحصائيات الأسبوع');
      }
      return response.json();
    },
    enabled: !!driverId,
  });

  // تحديث حالة السائق
  const updateStatusMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAvailable }),
      });
      
      if (!response.ok) {
        throw new Error('فشل في تحديث الحالة');
      }
      
      return response.json();
    },
    onSuccess: (data, isAvailable) => {
      setDriverStatus(isAvailable);
      
      // تحديث بيانات السائق في localStorage
      if (currentDriver) {
        const updatedDriver = { ...currentDriver, isAvailable };
        setCurrentDriver(updatedDriver);
        localStorage.setItem('driver_user', JSON.stringify(updatedDriver));
      }
      
      toast({
        title: isAvailable ? "أنت متاح الآن" : "أنت غير متاح",
        description: isAvailable ? "ستتلقى طلبات جديدة" : "لن تتلقى طلبات جديدة",
      });
      
      // إعادة جلب الطلبات المتاحة
      if (isAvailable) {
        refetchAvailableOrders();
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // قبول طلب
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في قبول الطلب');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم قبول الطلب",
        description: "يمكنك الآن بدء رحلة التوصيل",
      });
      
      // إعادة جلب البيانات
      refetchAvailableOrders();
      refetchMyOrders();
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', driverId, 'stats'] });
    },
    onError: (error) => {
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      const statusMessages: Record<string, string> = {
        'picked_up': 'تم استلام الطلب من المطعم',
        'on_way': 'أنت في الطريق للعميل',
        'delivered': 'تم تسليم الطلب بنجاح'
      };
      
      toast({
        title: "تم تحديث حالة الطلب",
        description: statusMessages[variables.status] || 'تم تحديث الحالة',
      });
      
      // إعادة جلب البيانات
      refetchMyOrders();
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', driverId, 'stats'] });
      
      // إذا تم تسليم الطلب، تحديث حالة السائق إلى متاح
      if (variables.status === 'delivered') {
        setDriverStatus(true);
        updateStatusMutation.mutate(true);
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    onLogout();
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

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'في الانتظار',
      'confirmed': 'مؤكد',
      'preparing': 'قيد التحضير',
      'ready': 'جاهز للاستلام',
      'picked_up': 'تم الاستلام',
      'on_way': 'في الطريق',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-orange-100 text-orange-800',
      'ready': 'bg-purple-100 text-purple-800',
      'picked_up': 'bg-indigo-100 text-indigo-800',
      'on_way': 'bg-green-100 text-green-800',
      'delivered': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // الطلبات النشطة للسائق
  const activeOrders = myOrders?.filter(order => 
    ['preparing', 'ready', 'picked_up', 'on_way'].includes(order.status || '')
  ) || [];

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
                <p className="text-sm text-gray-500">{currentDriver?.name || 'السائق'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* مؤشر التحديث التلقائي */}
              <div className="flex items-center gap-2 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>تحديث مباشر</span>
              </div>
              
              {/* حالة التوفر */}
              <div className="flex items-center gap-2">
                <Label htmlFor="driver-status" className="text-sm text-gray-700">متاح</Label>
                <Switch
                  id="driver-status"
                  checked={driverStatus}
                  onCheckedChange={(checked) => updateStatusMutation.mutate(checked)}
                  disabled={updateStatusMutation.isPending}
                  data-testid="switch-driver-status"
                />
              </div>
              
              {/* زر إعادة التحديث */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchAvailableOrders();
                  refetchMyOrders();
                }}
                disabled={ordersLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              
              {/* تسجيل الخروج */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">طلبات اليوم</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="today-orders">
                    {todayStats?.totalOrders || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">أرباح اليوم</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="today-earnings">
                    {formatCurrency(todayStats?.totalEarnings || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">أرباح الأسبوع</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(weekStats?.totalEarnings || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الحالة</p>
                  <p className="text-lg font-bold text-orange-600">
                    {driverStatus ? 'متاح' : 'غير متاح'}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الطلبات النشطة */}
        {activeOrders.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Package className="h-5 w-5" />
                الطلبات الحالية ({activeOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeOrders.map((order) => {
                const items = getOrderItems(order.items);
                const canPickUp = order.status === 'ready';
                const canMarkOnWay = order.status === 'picked_up';
                const canDeliver = order.status === 'on_way';
                
                return (
                  <div key={order.id} className="bg-white border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">
                          طلب #{order.orderNumber || order.id.slice(0, 8)}
                        </h4>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <Badge className={getStatusColor(order.status || 'pending')}>
                          {getStatusText(order.status || 'pending')}
                        </Badge>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-green-600">
                          {formatCurrency(order.totalAmount || '0')}
                        </p>
                        <p className="text-sm text-gray-500">
                          عمولة: {formatCurrency(order.driverEarnings || '0')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{order.deliveryAddress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{order.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {items.length} عنصر - {order.paymentMethod === 'cash' ? 'دفع نقدي' : 'مدفوع مسبقاً'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {canPickUp && (
                        <Button
                          onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'picked_up' })}
                          disabled={updateOrderStatusMutation.isPending}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                          data-testid={`button-pickup-${order.id}`}
                        >
                          تم الاستلام من المطعم
                        </Button>
                      )}
                      
                      {canMarkOnWay && (
                        <Button
                          onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'on_way' })}
                          disabled={updateOrderStatusMutation.isPending}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                          data-testid={`button-on-way-${order.id}`}
                        >
                          في الطريق للعميل
                        </Button>
                      )}
                      
                      {canDeliver && (
                        <Button
                          onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}
                          disabled={updateOrderStatusMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          data-testid={`button-deliver-${order.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          تم التسليم
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        onClick={() => window.open(`tel:${order.customerPhone}`)}
                        className="gap-2"
                        data-testid={`button-call-${order.id}`}
                      >
                        <Phone className="h-4 w-4" />
                        اتصال
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          const address = encodeURIComponent(order.deliveryAddress);
                          const url = order.customerLocationLat && order.customerLocationLng 
                            ? `https://www.google.com/maps?q=${order.customerLocationLat},${order.customerLocationLng}`
                            : `https://www.google.com/maps/search/?api=1&query=${address}`;
                          window.open(url, '_blank');
                        }}
                        className="gap-2"
                        data-testid={`button-navigate-${order.id}`}
                      >
                        <Navigation className="h-4 w-4" />
                        التنقل
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* الطلبات المتاحة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                الطلبات المتاحة
                {availableOrders && availableOrders.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {availableOrders.length}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAvailableOrders()}
                  disabled={ordersLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                  تحديث
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!driverStatus ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">غير متاح للعمل</h3>
                <p className="text-gray-500 mb-4">قم بتفعيل حالة التوفر لاستقبال الطلبات</p>
                <Button 
                  onClick={() => updateStatusMutation.mutate(true)}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  تفعيل حالة التوفر
                </Button>
              </div>
            ) : ordersLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : !availableOrders || availableOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد طلبات متاحة</h3>
                <p className="text-gray-500">سيتم إشعارك عند توفر طلبات جديدة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => {
                  const items = getOrderItems(order.items);
                  const totalAmount = parseFloat(order.totalAmount || '0');
                  const estimatedEarnings = parseFloat(order.driverEarnings || '0');
                  
                  return (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            طلب #{order.orderNumber || order.id.slice(0, 8)}
                          </h4>
                          <p className="text-sm text-gray-600">{order.customerName}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.createdAt.toString())}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary">{formatCurrency(totalAmount)}</p>
                          <p className="text-sm text-green-600">
                            عمولتك: {formatCurrency(estimatedEarnings)}
                          </p>
                          <Badge className="mt-1 bg-blue-100 text-blue-800">
                            {getStatusText(order.status || 'pending')}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{order.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {items.length} عنصر - {order.paymentMethod === 'cash' ? 'دفع نقدي' : 'مدفوع مسبقاً'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            الوقت المتوقع: {order.estimatedTime || '30-45 دقيقة'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => acceptOrderMutation.mutate(order.id)}
                          disabled={acceptOrderMutation.isPending || activeOrders.length > 0}
                          data-testid={`button-accept-${order.id}`}
                        >
                          {acceptOrderMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              جاري القبول...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              قبول الطلب
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const address = encodeURIComponent(order.deliveryAddress);
                            const url = order.customerLocationLat && order.customerLocationLng 
                              ? `https://www.google.com/maps?q=${order.customerLocationLat},${order.customerLocationLng}`
                              : `https://www.google.com/maps/search/?api=1&query=${address}`;
                            window.open(url, '_blank');
                          }}
                          data-testid={`button-view-location-${order.id}`}
                        >
                          عرض الموقع
                        </Button>
                      </div>
                      
                      {activeOrders.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          ⚠️ لديك طلب نشط. أكمل التوصيل الحالي قبل قبول طلب جديد
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ملخص الأرباح */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* معلومات إضافية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              معلومات السائق
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">الاسم:</p>
              <p className="font-medium">{currentDriver?.name || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">رقم الهاتف:</p>
              <p className="font-medium">{currentDriver?.phone || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">الموقع الحالي:</p>
              <p className="font-medium">{currentDriver?.currentLocation || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي الأرباح:</p>
              <p className="font-medium text-green-600">
                {formatCurrency(currentDriver?.earnings || '0')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;