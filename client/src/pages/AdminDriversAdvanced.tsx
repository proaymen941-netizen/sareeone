// AdminDriversAdvanced.tsx - نسخة محسنة ومتجاوبة
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Truck, Users, Wallet, BarChart3, Star, Clock, DollarSign, 
  MapPin, Phone, Mail, Shield, Award, AlertCircle, Download,
  Filter, Search, Eye, Edit, Trash2, CheckCircle, XCircle,
  ArrowRight, ChevronLeft, ChevronRight, MoreVertical, Activity,
  Navigation, UserCheck, UserX, Calendar, TrendingUp, Target,
  Smartphone, Monitor, Laptop, Tablet, CreditCard, Banknote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DriverStats {
  id: string;
  name: string;
  email?: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  availability: 'available' | 'busy' | 'offline';
  rating: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  avgRating: number;
  joinDate: string;
  lastActive: string;
  isVerified: boolean;
  isOnline: boolean;
  vehicleType?: string;
  vehicleNumber?: string;
  walletBalance: number;
  withdrawalRequests: Array<{
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: string;
    paymentMethod?: string;
  }>;
  performance: {
    acceptanceRate: number;
    onTimeRate: number;
    customerSatisfaction: number;
  };
}

export default function AdminDriversAdvanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState<DriverStats | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(isMobile ? 5 : 10);
  
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [withdrawalAction, setWithdrawalAction] = useState<'approve' | 'reject'>('approve');
  const [actionNotes, setActionNotes] = useState('');

  // 🔄 جلب بيانات السائقين مع الإحصائيات
  const { data: drivers, isLoading } = useQuery<DriverStats[]>({
    queryKey: ['/api/admin/drivers/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/drivers/stats');
      return response.json();
    },
  });

  // ✏️ تحديث حالة السائق
  const updateDriverStatus = useMutation({
    mutationFn: async ({ driverId, status }: { driverId: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/admin/drivers/${driverId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers/stats'] });
      toast({
        title: "تم تحديث الحالة",
        description: "تم تحديث حالة السائق بنجاح",
      });
    },
  });

  // 💰 معالجة طلبات السحب
  const processWithdrawal = useMutation({
    mutationFn: async ({ requestId, action, notes }: { requestId: string; action: 'approve' | 'reject'; notes?: string }) => {
      const response = await apiRequest('POST', `/api/admin/drivers/withdrawals/${requestId}/${action}`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers/stats'] });
      toast({
        title: "تمت المعالجة",
        description: "تمت معالجة طلب السحب بنجاح",
      });
      setShowWithdrawalDialog(false);
      setSelectedWithdrawal(null);
      setActionNotes('');
    },
  });

  // تصفية السائقين
  const filteredDrivers = drivers?.filter(driver => {
    if (statusFilter !== 'all' && driver.status !== statusFilter) return false;
    if (availabilityFilter !== 'all' && driver.availability !== availabilityFilter) return false;
    if (searchTerm && !driver.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !driver.phone.includes(searchTerm) && 
        !driver.email?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // التقسيم للصفحات
  const paginatedDrivers = filteredDrivers?.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil((filteredDrivers?.length || 0) / pageSize);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'نشط', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      suspended: { label: 'موقوف', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge className={`${config.color} text-xs px-2 py-1`}>{config.label}</Badge>;
  };

  const getAvailabilityBadge = (availability: string) => {
    const availabilityConfig = {
      available: { label: 'متاح', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: '🟢' },
      busy: { label: 'مشغول', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', icon: '🟠' },
      offline: { label: 'غير متصل', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: '⚫' },
    };
    const config = availabilityConfig[availability as keyof typeof availabilityConfig] || availabilityConfig.offline;
    return (
      <Badge className={`${config.color} text-xs px-2 py-1 gap-1`}>
        <span>{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  const handleWithdrawalAction = (withdrawal: any, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setWithdrawalAction(action);
    setShowWithdrawalDialog(true);
  };

  const renderMobileDriverCard = (driver: DriverStats) => (
    <Card key={driver.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {driver.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{driver.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(driver.status)}
                {getAvailabilityBadge(driver.availability)}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSelectedDriver(driver);
                setShowDetailsSheet(true);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                التفاصيل
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Phone className="h-4 w-4 mr-2" />
                اتصال
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Navigation className="h-4 w-4 mr-2" />
                تتبع
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">الهاتف</p>
            <p className="text-sm font-medium">{driver.phone}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">التقييم</p>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{driver.avgRating.toFixed(1)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">الطلبات</p>
            <p className="text-sm font-medium">{driver.completedOrders}/{driver.totalOrders}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">الأرباح</p>
            <p className="text-sm font-medium">{driver.totalEarnings.toFixed(2)} ر.س</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{driver.walletBalance.toFixed(2)} ر.س</span>
          </div>
          {driver.withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
            <Badge variant="outline" className="text-xs">
              {driver.withdrawalRequests.filter(r => r.status === 'pending').length} طلب سحب
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header مع زر الرجوع */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="md:hidden"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="hidden md:flex gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            العودة للوحة التحكم
          </Button>
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary hidden md:block" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">إدارة حسابات السائقين</h1>
              <p className="text-sm md:text-base text-muted-foreground">إدارة شاملة لبيانات وتقارير وأداء السائقين</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}} className="gap-2 text-xs md:text-sm">
            <Download className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline">تصدير التقرير</span>
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة متجاوبة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">إجمالي السائقين</p>
                <p className="text-xl md:text-2xl font-bold">{drivers?.length || 0}</p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">النشطين الآن</p>
                <p className="text-xl md:text-2xl font-bold">
                  {drivers?.filter(d => d.isOnline).length || 0}
                </p>
              </div>
              <Activity className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">إجمالي الأرباح</p>
                <p className="text-xl md:text-2xl font-bold">
                  {drivers?.reduce((sum, d) => sum + d.totalEarnings, 0).toFixed(0)} ر.س
                </p>
              </div>
              <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">طلبات السحب</p>
                <p className="text-xl md:text-2xl font-bold">
                  {drivers?.reduce((sum, d) => sum + d.withdrawalRequests.filter(w => w.status === 'pending').length, 0) || 0}
                </p>
              </div>
              <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* فلتر البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن سائق (الاسم، الهاتف، البريد)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 md:w-32">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="suspended">موقوف</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-28 md:w-32">
                  <SelectValue placeholder="التوفر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="available">متاح</SelectItem>
                  <SelectItem value="busy">مشغول</SelectItem>
                  <SelectItem value="offline">غير متصل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* المحتوى الرئيسي */}
      {isMobile ? (
        /* عرض الجوال */
        <div className="space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-full" />
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-3 bg-muted rounded w-16" />
                      </div>
                    </div>
                    <div className="h-8 w-8 bg-muted rounded" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-3 bg-muted rounded w-16" />
                        <div className="h-4 bg-muted rounded w-20" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : paginatedDrivers?.length ? (
            <>
              {paginatedDrivers.map(renderMobileDriverCard)}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    صفحة {page} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground">لم يتم العثور على سائقين مطابقين لبحثك</p>
            </div>
          )}
        </div>
      ) : (
        /* عرض الحاسوب والتابلت */
        <Card>
          <CardHeader>
            <CardTitle>قائمة السائقين</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>السائق</TableHead>
                    {!isTablet && <TableHead>التواصل</TableHead>}
                    <TableHead>الحالة</TableHead>
                    <TableHead>التقييم</TableHead>
                    <TableHead>الطلبات</TableHead>
                    <TableHead>الأرباح</TableHead>
                    <TableHead>المحفظة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(7)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedDrivers?.length ? (
                    paginatedDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                {driver.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{driver.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(driver.joinDate).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        {!isTablet && (
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {driver.phone}
                              </p>
                              {driver.email && (
                                <p className="text-sm flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {driver.email}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(driver.status)}
                            {getAvailabilityBadge(driver.availability)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-medium">{driver.avgRating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">إجمالي: {driver.totalOrders}</p>
                            <div className="flex items-center gap-2">
                              <Progress value={(driver.completedOrders / driver.totalOrders) * 100} className="h-2" />
                              <span className="text-xs">{driver.completedOrders}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{driver.totalEarnings.toFixed(2)} ر.س</p>
                            <p className="text-xs text-green-600">اليوم: {driver.todayEarnings.toFixed(2)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{driver.walletBalance.toFixed(2)} ر.س</span>
                            </div>
                            {driver.withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {driver.withdrawalRequests.filter(r => r.status === 'pending').length} طلب سحب
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDriver(driver);
                                setShowDetailsDialog(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Select
                              value={driver.status}
                              onValueChange={(value) => updateDriverStatus.mutate({ 
                                driverId: driver.id, 
                                status: value 
                              })}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">تفعيل</SelectItem>
                                <SelectItem value="inactive">تعطيل</SelectItem>
                                <SelectItem value="suspended">إيقاف</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد نتائج</h3>
                        <p className="text-muted-foreground">لم يتم العثور على سائقين مطابقين لبحثك</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6">
                <div className="text-sm text-muted-foreground">
                  عرض {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredDrivers?.length || 0)} من {filteredDrivers?.length || 0} سائق
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog تفاصيل السائق */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل السائق</DialogTitle>
          </DialogHeader>
          
          {selectedDriver && (
            <div className="space-y-6">
              {/* معلومات أساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>الاسم الكامل</Label>
                  <p className="font-medium">{selectedDriver.name}</p>
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <p className="font-medium">{selectedDriver.phone}</p>
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <p className="font-medium">{selectedDriver.email || 'غير متوفر'}</p>
                </div>
                <div>
                  <Label>تاريخ الانضمام</Label>
                  <p className="font-medium">
                    {new Date(selectedDriver.joinDate).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>

              {/* الإحصائيات */}
              <Card>
                <CardHeader>
                  <CardTitle>الإحصائيات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold">{selectedDriver.totalOrders}</p>
                      <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold">{selectedDriver.completedOrders}</p>
                      <p className="text-sm text-muted-foreground">مكتملة</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold">{selectedDriver.avgRating.toFixed(1)} ⭐</p>
                      <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold">{selectedDriver.totalEarnings.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* المحفظة */}
              <Card>
                <CardHeader>
                  <CardTitle>المحفظة والتحويلات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>الرصيد المتاح</span>
                      <span className="text-xl font-bold text-green-600">
                        {selectedDriver.walletBalance.toFixed(2)} ر.س
                      </span>
                    </div>
                    
                    <div>
                      <Label>طلبات السحب المعلقة</Label>
                      {selectedDriver.withdrawalRequests.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {selectedDriver.withdrawalRequests.map(request => (
                            <div key={request.id} className="flex justify-between items-center p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{request.amount.toFixed(2)} ر.س</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleDateString('ar-SA')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }>
                                  {request.status === 'pending' ? 'معلق' :
                                  request.status === 'approved' ? 'مقبول' : 'مرفوض'}
                                </Badge>
                                {request.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleWithdrawalAction(request, 'approve')}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleWithdrawalAction(request, 'reject')}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground p-3 border rounded-lg">لا توجد طلبات سحب</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sheet تفاصيل السائق للجوال */}
      <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>تفاصيل السائق</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pt-6">
            {selectedDriver && (
              <div className="space-y-6">
                {/* معلومات السائق */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl">
                      {selectedDriver.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedDriver.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(selectedDriver.status)}
                      {getAvailabilityBadge(selectedDriver.availability)}
                    </div>
                  </div>
                </div>

                {/* معلومات الاتصال */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                      <p className="font-medium">{selectedDriver.phone}</p>
                    </div>
                  </div>
                  {selectedDriver.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                        <p className="font-medium">{selectedDriver.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* الإحصائيات */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">الطلبات</p>
                    <p className="text-2xl font-bold">{selectedDriver.totalOrders}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">المكتملة</p>
                    <p className="text-2xl font-bold">{selectedDriver.completedOrders}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">التقييم</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-2xl font-bold">{selectedDriver.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">الأرباح</p>
                    <p className="text-2xl font-bold">{selectedDriver.totalEarnings.toFixed(0)}</p>
                  </div>
                </div>

                {/* المحفظة */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">المحفظة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>الرصيد المتاح</span>
                        <span className="text-xl font-bold text-green-600">
                          {selectedDriver.walletBalance.toFixed(2)} ر.س
                        </span>
                      </div>
                      
                      {selectedDriver.withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">طلبات السحب المعلقة</p>
                          <div className="space-y-2">
                            {selectedDriver.withdrawalRequests.filter(r => r.status === 'pending').map(request => (
                              <div key={request.id} className="p-3 border rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold">{request.amount.toFixed(2)} ر.س</span>
                                  <Badge className="bg-yellow-100 text-yellow-800">معلق</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleWithdrawalAction(request, 'approve')}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    قبول
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleWithdrawalAction(request, 'reject')}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    رفض
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* الإجراءات */}
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="gap-2">
                    <Phone className="h-4 w-4" />
                    اتصال
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Navigation className="h-4 w-4" />
                    تتبع
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    تعديل
                  </Button>
                  <Select
                    value={selectedDriver.status}
                    onValueChange={(value) => {
                      updateDriverStatus.mutate({ 
                        driverId: selectedDriver.id, 
                        status: value 
                      });
                      setShowDetailsSheet(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="تغيير الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">تفعيل</SelectItem>
                      <SelectItem value="inactive">تعطيل</SelectItem>
                      <SelectItem value="suspended">إيقاف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Dialog معالجة طلب السحب */}
      <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {withdrawalAction === 'approve' ? 'موافقة على طلب السحب' : 'رفض طلب السحب'}
            </DialogTitle>
            <DialogDescription>
              {withdrawalAction === 'approve' 
                ? 'هل أنت متأكد من الموافقة على هذا الطلب؟' 
                : 'يرجى ذكر سبب الرفض'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">المبلغ: {selectedWithdrawal.amount} ر.س</p>
                <p className="text-sm text-muted-foreground">
                  التاريخ: {new Date(selectedWithdrawal.createdAt).toLocaleDateString('ar-SA')}
                </p>
              </div>
              
              {withdrawalAction === 'reject' && (
                <div>
                  <Label htmlFor="reason">سبب الرفض</Label>
                  <Input
                    id="reason"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="أدخل سبب الرفض..."
                  />
                </div>
              )}
              
              {withdrawalAction === 'approve' && (
                <div>
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Input
                    id="notes"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="ملاحظات إضافية..."
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawalDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant={withdrawalAction === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (withdrawalAction === 'reject' && !actionNotes.trim()) {
                  toast({
                    title: "خطأ",
                    description: "يرجى إدخال سبب الرفض",
                    variant: "destructive",
                  });
                  return;
                }
                processWithdrawal.mutate({
                  requestId: selectedWithdrawal.id,
                  action: withdrawalAction,
                  notes: actionNotes
                });
              }}
              disabled={processWithdrawal.isPending}
            >
              {processWithdrawal.isPending ? 'جاري المعالجة...' : 
                withdrawalAction === 'approve' ? 'موافقة' : 'رفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
