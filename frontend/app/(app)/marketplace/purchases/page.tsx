'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShoppingCart,
  Download,
  Filter,
  Search,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Receipt,
} from 'lucide-react';
import {
  useReservationTransactions,
  useLeadReservationBalance,
} from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'PURCHASE' | 'SPEND' | 'REFUND'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const { data: transactionsData, isLoading } = useReservationTransactions(100, 0);
  const { data: balanceData } = useLeadReservationBalance();

  const balance = balanceData?.balance || 0;
  const transactions = transactionsData?.transactions || [];

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  const totalPurchased = transactions
    .filter((t) => t.type === 'PURCHASE')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.type === 'SPEND')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalRefunded = transactions
    .filter((t) => t.type === 'REFUND')
    .reduce((sum, t) => sum + t.amount, 0);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'REFUND':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'SPEND':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases & Invoices</h1>
          <p className="text-muted-foreground mt-1">
            View your purchase history, invoices, and transaction details
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance.toFixed(2)} LR</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalPurchased.toFixed(2)} LR
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalSpent.toFixed(2)} LR
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalRefunded.toFixed(2)} LR
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'PURCHASE', 'SPEND', 'REFUND'] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' ? 'All' : type}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateRange(range)}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground">
                  {filterType !== 'all'
                    ? `No ${filterType.toLowerCase()} transactions in this period`
                    : 'Your transaction history will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <div className="font-medium capitalize">
                              {transaction.type.toLowerCase()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                            {transaction.metadata && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {transaction.metadata.listingName && (
                                  <span>Listing: {transaction.metadata.listingName}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              transaction.type === 'SPEND'
                                ? 'text-red-600'
                                : transaction.type === 'PURCHASE' || transaction.type === 'REFUND'
                                ? 'text-green-600'
                                : ''
                            }`}
                          >
                            {transaction.type === 'SPEND' ? '-' : '+'}
                            {Math.abs(transaction.amount).toFixed(2)} LR
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {transaction.type}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoices
              </CardTitle>
              <CardDescription>
                Download invoices for your Lead Reservation purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.filter((t) => t.type === 'PURCHASE').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices available</p>
                  <p className="text-sm mt-2">
                    Invoices will be generated when you purchase Lead Reservations
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions
                    .filter((t) => t.type === 'PURCHASE')
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            Invoice #{transaction.id.substring(0, 8).toUpperCase()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'MMMM dd, yyyy')}
                          </div>
                          <div className="text-sm font-semibold mt-1">
                            {transaction.amount.toFixed(2)} LR
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Purchases</CardTitle>
              <CardDescription>
                View Lead Reservations spent on subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Subscription purchase details coming soon</p>
                <p className="text-sm mt-2">
                  View detailed breakdown of Lead Reservations spent per subscription
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

