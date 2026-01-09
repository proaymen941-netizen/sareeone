// AdminDriversAdvanced.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Truck, User, Wallet, BarChart3, Star, Clock, DollarSign, 
  MapPin, Phone, Mail, Shield, Award, AlertCircle, Download,
  Filter, Search, Eye, Edit, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Driver } from '@shared/schema';

interface DriverStats {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
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
  vehicleType: string;
  vehicleNumber: string;
  walletBalance: number;
  withdrawalRequests: Array<{
    id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
  }>;
  performance: {
    acceptanceRate: number;
    onTimeRate: number;
    customerSatisfaction: number;
  };
  documents: Array<{
    type: string;
    url: string;
    status: 'verified' | 'pending' | 'rejected';
  }>;
}

export default function AdminDriversAdvanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState<DriverStats | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 🔄 جلب بيانات السائقين مع الإحصائيات
  const { data: drivers, isLoading } = useQuery<DriverStats[]>({
    queryKey: ['/api/admin/drivers/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/drivers/stats');
      return response.json();
    },
  });

  // 🔄 جلب تقارير الأداء
  const { data: performanceReports } = useQuery({
    queryKey: ['/api/admin/drivers/performance'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/drivers/performance');
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
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => {
      const response = await apiRequest('POST', `/api/admin/withdrawals/${requestId}/${action}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers/stats'] });
      toast({
        title: "تمت المعالجة",
        description: "تمت معالجة طلب السحب بنجاح",
      });
    },
  });

  // 📊 تصدير التقارير
  const exportReport = (type: 'excel' | 'pdf') => {
    // تنفيذ تصدير التقرير
    toast({
      title: "جاري التصدير",
      description: `جاري تصدير التقرير بصيغة ${type.toUpperCase()}`,
    });
  };

  const filteredDrivers = drivers?.filter(driver => {
    if (statusFilter !== 'all' && driver.status !== statusFilter) return false;
    if (searchTerm && !driver.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !driver.phone.includes(searchTerm)) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
      inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-800' },
      suspended: { label: 'موقوف', color: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة حسابات السائقين</h1>
            <p className="text-muted-foreground">إدارة شاملة لبيانات وتقارير وأداء السائقين</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('excel')} className="gap-2">
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')} className="gap-2">
            <Download className="h-4 w-4" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي السائقين</p>
                <p className="text-2xl font-bold">{drivers?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">النشطين الآن</p>
                <p className="text-2xl font-bold">
                  {drivers?.filter(d => d.status === 'active').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                <p className="text-2xl font-bold">
                  {drivers?.reduce((sum, d) => sum + d.totalEarnings, 0).toFixed(2)} ريال
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                <p className="text-2xl font-bold">
                  {(drivers?.reduce((sum, d) => sum + d.avgRating, 0) / (drivers?.length || 1)).toFixed(1)} ⭐
                </p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">جميع السائقين</TabsTrigger>
          <TabsTrigger value="active">النشطين</TabsTrigger>
          <TabsTrigger value="pending">بانتظار التحقق</TabsTrigger>
          <TabsTrigger value="withdrawals">طلبات السحب</TabsTrigger>
          <TabsTrigger value="performance">تقارير الأداء</TabsTrigger>
        </TabsList>

        {/* Tab 1: جميع السائقين */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>قائمة السائقين</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث عن سائق..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                      <SelectItem value="suspended">موقوف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>السائق</TableHead>
                    <TableHead>التواصل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التقييم</TableHead>
                    <TableHead>الطلبات</TableHead>
                    <TableHead>الأرباح</TableHead>
                    <TableHead>المحفظة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers?.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{driver.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(driver.joinDate).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {driver.phone}
                          </p>
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {driver.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(driver.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{driver.avgRating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">إجمالي: {driver.totalOrders}</p>
                          <p className="text-xs text-green-600">مكتمل: {driver.completedOrders}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{driver.totalEarnings.toFixed(2)} ريال</p>
                        <p className="text-xs text-muted-foreground">اليوم: {driver.todayEarnings.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{driver.walletBalance.toFixed(2)} ريال</span>
                        </div>
                        {driver.withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {driver.withdrawalRequests.filter(r => r.status === 'pending').length} طلب سحب
                          </Badge>
                        )}
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Select
                            value={driver.status}
                            onValueChange={(value) => updateDriverStatus.mutate({ 
                              driverId: driver.id, 
                              status: value 
                            })}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: النشطين */}
        <TabsContent value="active">
          {/* محتوى مشابه مع فلترة للنشطين فقط */}
        </TabsContent>

        {/* Tab 3: طلبات السحب */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>طلبات السحب المعلقة</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>السائق</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>طريقة السحب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers?.flatMap(driver => 
                    driver.withdrawalRequests
                      .filter(request => request.status === 'pending')
                      .map(request => (
                        <TableRow key={request.id}>
                          <TableCell>{driver.name}</TableCell>
                          <TableCell className="font-bold">{request.amount.toFixed(2)} ريال</TableCell>
                          <TableCell>تحويل بنكي</TableCell>
                          <TableCell>
                            <Badge className="bg-yellow-100 text-yellow-800">معلق</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => processWithdrawal.mutate({ 
                                  requestId: request.id, 
                                  action: 'approve' 
                                })}
                              >
                                <CheckCircle className="h-4 w-4" />
                                قبول
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => processWithdrawal.mutate({ 
                                  requestId: request.id, 
                                  action: 'reject' 
                                })}
                              >
                                <XCircle className="h-4 w-4" />
                                رفض
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: تقارير الأداء */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  مؤشرات الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* مخططات أداء السائقين */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  السائقين المتميزين
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* قائمة السائقين المتميزين */}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* تفاصيل السائق Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>تفاصيل السائق</DialogTitle>
          </DialogHeader>
          
          {selectedDriver && (
            <div className="space-y-6">
              {/* معلومات أساسية */}
              <div className="grid grid-cols-2 gap-4">
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
                  <p className="font-medium">{selectedDriver.email}</p>
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
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedDriver.totalOrders}</p>
                      <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedDriver.completedOrders}</p>
                      <p className="text-sm text-muted-foreground">مكتملة</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedDriver.avgRating.toFixed(1)} ⭐</p>
                      <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                    </div>
                    <div className="text-center">
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
                    <div className="flex justify-between items-center">
                      <span>الرصيد المتاح</span>
                      <span className="text-xl font-bold text-green-600">
                        {selectedDriver.walletBalance.toFixed(2)} ريال
                      </span>
                    </div>
                    
                    <div>
                      <Label>طلبات السحب المعلقة</Label>
                      {selectedDriver.withdrawalRequests.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {selectedDriver.withdrawalRequests.map(request => (
                            <div key={request.id} className="flex justify-between items-center p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{request.amount.toFixed(2)} ريال</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleDateString('ar-SA')}
                                </p>
                              </div>
                              <Badge className={
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {request.status === 'pending' ? 'معلق' :
                                 request.status === 'approved' ? 'مقبول' : 'مرفوض'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">لا توجد طلبات سحب</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
