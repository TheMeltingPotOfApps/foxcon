'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  History,
} from 'lucide-react';
import {
  useLeadReservationBalance,
  usePurchaseReservations,
  useReservationTransactions,
} from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function ReservationsPage() {
  const [usdAmount, setUsdAmount] = useState('');
  const { data: balanceData, isLoading: balanceLoading } = useLeadReservationBalance();
  const { data: transactionsData } = useReservationTransactions(50, 0);
  const purchaseReservations = usePurchaseReservations();

  const balance = balanceData?.balance || 0;
  const transactions = transactionsData?.transactions || [];

  const handlePurchase = async () => {
    const amount = parseFloat(usdAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await purchaseReservations.mutateAsync({ usdAmount: amount });
      toast.success(`Successfully purchased Lead Reservations`);
      setUsdAmount('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase Lead Reservations');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
      case 'REFUND':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'SPEND':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lead Reservations</h1>
        <p className="text-muted-foreground mt-1">
          Manage your Lead Reservations balance and purchase history
        </p>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balanceLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded"></div>
          ) : (
            <div className="text-4xl font-bold">{balance.toFixed(2)} LR</div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Card */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Lead Reservations</CardTitle>
          <CardDescription>
            Buy Lead Reservations to subscribe to lead listings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usdAmount">Amount (USD)</Label>
            <Input
              id="usdAmount"
              type="number"
              placeholder="100.00"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              min="0.01"
              step="0.01"
            />
          </div>
          <Button
            onClick={handlePurchase}
            disabled={!usdAmount || purchaseReservations.isPending}
            className="w-full"
          >
            {purchaseReservations.isPending ? 'Processing...' : 'Purchase'}
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <div className="font-medium capitalize">{transaction.type.toLowerCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      transaction.type === 'PURCHASE' || transaction.type === 'REFUND'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'SPEND' ? '-' : '+'}
                    {Math.abs(transaction.amount).toFixed(2)} LR
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

