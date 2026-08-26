// =============================================
// ADD/EDIT SALARY MODAL - Notion Agency OS UI
// =============================================

import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSalary, useUpdateSalary } from '../../hooks/useSalary';
import { useEmployees } from '../../hooks/useHR';
import {
  Banknote,
  Coins,
  CreditCard,
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  Receipt,
  User,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

const salarySchema = z.object({
  employee: z.string().min(1, 'Employee selection is required'),
  month: z.string().min(1, 'Month is required'),
  year: z.coerce.number().min(2020).max(2035),
  payPeriod: z.string().optional().or(z.literal('')),
  baseSalary: z.coerce.number().min(0, 'Base salary cannot be negative'),
  incentive: z.coerce.number().min(0, 'Incentive cannot be negative'),
  incentiveReason: z.string().optional().or(z.literal('')),
  ots: z.coerce.number().min(0, 'OTS amount cannot be negative'),
  otsHours: z.coerce.number().min(0).optional(),
  otsReason: z.string().optional().or(z.literal('')),
  otherAllowances: z.coerce.number().min(0, 'Other allowances cannot be negative'),
  otherAllowancesReason: z.string().optional().or(z.literal('')),
  deductions: z.coerce.number().min(0, 'Deductions cannot be negative'),
  deductionReason: z.string().optional().or(z.literal('')),
  status: z.enum(['draft', 'pending', 'processing', 'paid', 'hold']),
  paymentDate: z.string().optional().or(z.literal('')),
  paymentMethod: z.enum(['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other']),
  transactionReference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const AddSalaryModal = ({ open, onOpenChange, salary = null, initialMonth = null, initialYear = null }) => {
  const isEditing = Boolean(salary?._id);

  const currentDate = new Date();
  const currentMonthName = MONTH_NAMES[currentDate.getMonth()];
  const currentYearNum = currentDate.getFullYear();

  const { data: employees = [] } = useEmployees();
  const createSalary = useCreateSalary();
  const updateSalary = useUpdateSalary();

  const form = useForm({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      employee: '',
      month: initialMonth || currentMonthName,
      year: initialYear || currentYearNum,
      payPeriod: '',
      baseSalary: 0,
      incentive: 0,
      incentiveReason: '',
      ots: 0,
      otsHours: 0,
      otsReason: '',
      otherAllowances: 0,
      otherAllowancesReason: '',
      deductions: 0,
      deductionReason: '',
      status: 'pending',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      transactionReference: '',
      notes: '',
    },
  });

  const selectedEmployeeId = useWatch({ control: form.control, name: 'employee' });
  const watchedBase = useWatch({ control: form.control, name: 'baseSalary' }) || 0;
  const watchedIncentive = useWatch({ control: form.control, name: 'incentive' }) || 0;
  const watchedOts = useWatch({ control: form.control, name: 'ots' }) || 0;
  const watchedOther = useWatch({ control: form.control, name: 'otherAllowances' }) || 0;
  const watchedDeductions = useWatch({ control: form.control, name: 'deductions' }) || 0;

  // Live calculation
  const grossPay = Number(watchedBase) + Number(watchedIncentive) + Number(watchedOts) + Number(watchedOther);
  const netPay = Math.max(0, grossPay - Number(watchedDeductions));

  // Auto-fill base salary when employee changes (only if adding new)
  useEffect(() => {
    if (!isEditing && selectedEmployeeId) {
      const matchedEmp = employees.find((e) => e._id === selectedEmployeeId);
      if (matchedEmp && matchedEmp.salary !== undefined) {
        form.setValue('baseSalary', Number(matchedEmp.salary || 0));
      }
    }
  }, [selectedEmployeeId, employees, isEditing, form]);

  useEffect(() => {
    if (salary) {
      const empId = typeof salary.employee === 'object' ? salary.employee?._id : salary.employee;
      form.reset({
        employee: empId || '',
        month: salary.month || currentMonthName,
        year: salary.year || currentYearNum,
        payPeriod: salary.payPeriod || '',
        baseSalary: Number(salary.baseSalary || 0),
        incentive: Number(salary.incentive || 0),
        incentiveReason: salary.incentiveReason || '',
        ots: Number(salary.ots || 0),
        otsHours: Number(salary.otsHours || 0),
        otsReason: salary.otsReason || '',
        otherAllowances: Number(salary.otherAllowances || 0),
        otherAllowancesReason: salary.otherAllowancesReason || '',
        deductions: Number(salary.deductions || 0),
        deductionReason: salary.deductionReason || '',
        status: salary.status || 'pending',
        paymentDate: salary.paymentDate
          ? new Date(salary.paymentDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        paymentMethod: salary.paymentMethod || 'Bank Transfer',
        transactionReference: salary.transactionReference || '',
        notes: salary.notes || '',
      });
    } else {
      form.reset({
        employee: '',
        month: initialMonth || currentMonthName,
        year: initialYear || currentYearNum,
        payPeriod: `${initialMonth || currentMonthName} ${initialYear || currentYearNum}`,
        baseSalary: 0,
        incentive: 0,
        incentiveReason: '',
        ots: 0,
        otsHours: 0,
        otsReason: '',
        otherAllowances: 0,
        otherAllowancesReason: '',
        deductions: 0,
        deductionReason: '',
        status: 'pending',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        transactionReference: '',
        notes: '',
      });
    }
  }, [salary, open, initialMonth, initialYear, form, currentMonthName, currentYearNum]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      baseSalary: Number(values.baseSalary),
      incentive: Number(values.incentive),
      ots: Number(values.ots),
      otsHours: Number(values.otsHours || 0),
      otherAllowances: Number(values.otherAllowances),
      deductions: Number(values.deductions),
      year: Number(values.year),
    };

    if (isEditing) {
      await updateSalary.mutateAsync({ id: salary._id, data: payload });
    } else {
      await createSalary.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isLoading = createSalary.isPending || updateSalary.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border border-border">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              💰
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                {isEditing ? 'Edit Employee Salary Breakdown' : 'Create Employee Salary Entry'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Notion Agency OS compensation record with base salary, performance incentive, OTS allowance, and adjustments.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Row 1: Employee & Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="employee"
                render={({ field }) => (
                  <FormItem className="sm:col-span-1">
                    <FormLabel className="text-xs font-bold">Team Member *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-56">
                        {employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{emp.name}</span>
                              <span className="text-[10px] text-muted-foreground">({emp.department || 'General'})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">Pay Month *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_NAMES.map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">Pay Year *</FormLabel>
                    <FormControl>
                      <Input type="number" className="rounded-xl h-9 text-xs" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Compensation Breakdown Matrix (Notion Agency OS Container) */}
            <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Banknote size={14} className="text-primary" />
                  Compensation & Allowances Breakdown
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">Values in INR (₹)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Base Salary */}
                <div className="p-3 rounded-xl bg-card border border-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1">
                      <CreditCard size={13} className="text-blue-500" />
                      1. Base Salary (₹) *
                    </FormLabel>
                  </div>
                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 50000"
                            className="rounded-xl h-8.5 text-xs font-bold"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground">Standard monthly contracted base pay.</p>
                </div>

                {/* 2. Incentive */}
                <div className="p-3 rounded-xl bg-card border border-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-500" />
                      2. Incentive / Bonus (₹)
                    </FormLabel>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    <FormField
                      control={form.control}
                      name="incentive"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="rounded-xl h-8.5 text-xs font-bold text-amber-600"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="incentiveReason"
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormControl>
                            <Input
                              placeholder="Reason: Target / Deals"
                              className="rounded-xl h-8.5 text-[11px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Performance commission or client retention incentives.</p>
                </div>

                {/* 3. OTS (Overtime Shifts / Allowance) */}
                <div className="p-3 rounded-xl bg-card border border-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Clock size={13} className="text-purple-500" />
                      3. OTS (Overtime Allowance ₹)
                    </FormLabel>
                  </div>
                  <div className="grid grid-cols-12 gap-1.5">
                    <FormField
                      control={form.control}
                      name="ots"
                      render={({ field }) => (
                        <FormItem className="col-span-5">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="rounded-xl h-8.5 text-xs font-bold text-purple-600"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otsHours"
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Hours"
                              className="rounded-xl h-8.5 text-[11px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otsReason"
                      render={({ field }) => (
                        <FormItem className="col-span-4">
                          <FormControl>
                            <Input
                              placeholder="Shift / Task"
                              className="rounded-xl h-8.5 text-[11px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Extra duty shifts, weekend shoots, or overtime allowances.</p>
                </div>

                {/* 4. Other Allowances */}
                <div className="p-3 rounded-xl bg-card border border-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Coins size={13} className="text-emerald-500" />
                      4. Other Allowances (₹)
                    </FormLabel>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    <FormField
                      control={form.control}
                      name="otherAllowances"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="rounded-xl h-8.5 text-xs font-bold text-emerald-600"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otherAllowancesReason"
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormControl>
                            <Input
                              placeholder="e.g. Travel, Food, Internet"
                              className="rounded-xl h-8.5 text-[11px]"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Reimbursements, food, travel, and custom allowances.</p>
                </div>
              </div>

              {/* Deductions Row */}
              <div className="p-3 rounded-xl bg-card border border-rose-500/20 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <Receipt size={13} />
                    5. Deductions / Adjustments (₹)
                  </FormLabel>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <FormField
                    control={form.control}
                    name="deductions"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="rounded-xl h-8.5 text-xs font-bold text-rose-600"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deductionReason"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormControl>
                          <Input
                            placeholder="e.g. Unpaid Leave, Advance repayment, TDS"
                            className="rounded-xl h-8.5 text-[11px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Live Notion Calculation Summary Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-emerald-500/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <span>Base: {currency.format(watchedBase)}</span>
                    <span>+</span>
                    <span className="text-amber-600">Inc: {currency.format(watchedIncentive)}</span>
                    <span>+</span>
                    <span className="text-purple-600">OTS: {currency.format(watchedOts)}</span>
                    <span>+</span>
                    <span className="text-emerald-600">Other: {currency.format(watchedOther)}</span>
                    {watchedDeductions > 0 && (
                      <>
                        <span>-</span>
                        <span className="text-rose-600">Ded: {currency.format(watchedDeductions)}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs font-bold text-muted-foreground">
                    Gross Earnings: <span className="text-foreground">{currency.format(grossPay)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-black tracking-wider text-primary">Net Take-Home Pay</div>
                  <div className="text-xl sm:text-2xl font-black text-foreground">{currency.format(netPay)}</div>
                </div>
              </div>
            </div>

            {/* Payment Status & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">Disbursal Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-9 text-xs capitalize">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="paid">Paid (Settled)</SelectItem>
                        <SelectItem value="hold">On Hold</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue placeholder="Payment Mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                        <SelectItem value="UPI">UPI Payment</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Other">Other Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="rounded-xl h-9 text-xs" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="transactionReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">Reference / UTR / Cheque #</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. UTR193847294829" className="rounded-xl h-9 text-xs" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">Internal Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional remarks..." className="rounded-xl h-9 text-xs" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="rounded-xl text-xs font-bold gap-1.5 shadow-sm">
                <CheckCircle2 size={14} />
                <span>{isLoading ? 'Saving...' : isEditing ? 'Update Salary Entry' : 'Save Salary Entry'}</span>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
