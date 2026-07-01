import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { PaymentModel, PaymentStatus } from '../payments/entities/payment.entity';
import { ExpenseModel } from '../expenses/entities/expense.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { GroupStudentModel } from '../group_student_model';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(PaymentModel) private paymentModel: typeof PaymentModel,
    @InjectModel(ExpenseModel) private expenseModel: typeof ExpenseModel,
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
    @InjectModel(EducationCenterModel) private centerModel: typeof EducationCenterModel,
    @InjectModel(GroupStudentModel) private groupStudentModel: typeof GroupStudentModel,
  ) {}

  async getDaily(date: string, center_id?: number) {
    const dayStart = date;
    const dayEnd = date;

    const paymentWhere: any = { paid_at: dayStart, status: PaymentStatus.PAID };
    if (center_id) paymentWhere.center_id = center_id;

    const expenseWhere: any = { date: dayStart };
    if (center_id) expenseWhere.center_id = center_id;

    const [payments, expenses] = await Promise.all([
      this.paymentModel.findAll({
        where: paymentWhere,
        include: [
          { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
          { model: GroupModel, attributes: ['id', 'name'] },
        ],
        order: [['created_at', 'DESC']],
      }),
      this.expenseModel.findAll({
        where: expenseWhere,
        order: [['created_at', 'DESC']],
      }),
    ]);

    const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      date,
      total_income: totalIncome,
      total_expense: totalExpense,
      net: totalIncome - totalExpense,
      incomes: payments.map(p => ({
        id: p.id,
        type: 'payment',
        amount: Number(p.amount),
        student_name: p.student ? `${p.student.first_name} ${p.student.last_name}` : 'N/A',
        student_phone: p.student?.phone_number || '',
        group_name: p.group?.name || '',
        payment_type: p.payment_type,
        created_by: p.created_by,
        paid_at: p.paid_at,
        created_at: p.created_at,
        note: p.note,
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        type: 'expense',
        amount: Number(e.amount),
        description: e.description,
        created_by: e.created_by,
        date: e.date,
        created_at: e.created_at,
      })),
    };
  }

  async getMonthly(year: number, month: number, center_id?: number) {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const paymentWhere: any = {
      paid_at: { [Op.between]: [monthStart, monthEnd] },
      status: PaymentStatus.PAID,
    };
    if (center_id) paymentWhere.center_id = center_id;

    const expenseWhere: any = {
      date: { [Op.between]: [monthStart, monthEnd] },
    };
    if (center_id) expenseWhere.center_id = center_id;

    const [totalIncome, totalExpense, payments, expenses] = await Promise.all([
      this.paymentModel.sum('amount', { where: paymentWhere }),
      this.expenseModel.sum('amount', { where: expenseWhere }),
      this.paymentModel.findAll({
        where: paymentWhere,
        include: [
          { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
          { model: GroupModel, attributes: ['id', 'name'] },
        ],
        order: [['paid_at', 'DESC']],
      }),
      this.expenseModel.findAll({
        where: expenseWhere,
        order: [['date', 'DESC']],
      }),
    ]);

    return {
      year,
      month,
      total_income: totalIncome || 0,
      total_expense: totalExpense || 0,
      net: (totalIncome || 0) - (totalExpense || 0),
      incomes: payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        student_name: p.student ? `${p.student.first_name} ${p.student.last_name}` : 'N/A',
        student_phone: p.student?.phone_number || '',
        group_name: p.group?.name || '',
        payment_type: p.payment_type,
        paid_at: p.paid_at,
        created_by: p.created_by,
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        amount: Number(e.amount),
        description: e.description,
        date: e.date,
        created_by: e.created_by,
      })),
    };
  }

  async getCashBalance(center_id?: number) {
    if (!center_id) return { balance: 0, center_id: null };
    const [totalIncome, totalExpense] = await Promise.all([
      this.paymentModel.sum('amount', {
        where: { center_id, status: { [Op.in]: [PaymentStatus.PAID, PaymentStatus.PARTIAL] } },
      }),
      this.expenseModel.sum('amount', {
        where: { center_id },
      }),
    ]);
    const balance = (totalIncome || 0) - (totalExpense || 0);
    return { center_id, balance };
  }

  async getOverview(center_id?: number) {
    const studentWhere: any = {};
    if (center_id) studentWhere.center_id = center_id;

    const totalStudents = await this.studentModel.count({ where: studentWhere });

    const gsStudents = await this.groupStudentModel.findAll({
      where: { left_date: null },
      attributes: ['student_id'],
    });
    const gsIds = [...new Set(gsStudents.map(gs => gs.student_id))];

    const studentsWithGroup = gsIds.length > 0
      ? await this.studentModel.count({
          where: { ...studentWhere, id: { [Op.in]: gsIds } },
        })
      : 0;

    const totalIncome = await this.paymentModel.sum('amount', {
      where: { ...(center_id ? { center_id } : {}), status: PaymentStatus.PAID },
    });

    const totalExpense = await this.expenseModel.sum('amount', {
      where: center_id ? { center_id } : {},
    });

    const monthlyIncome = await this.paymentModel.sum('amount', {
      where: {
        ...(center_id ? { center_id } : {}),
        status: PaymentStatus.PAID,
        paid_at: {
          [Op.gte]: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
        },
      },
    });

    const balance = center_id ? await this.getCashBalance(center_id) : { balance: 0 };

    return {
      total_students: totalStudents,
      students_with_group: studentsWithGroup,
      students_without_group: totalStudents - studentsWithGroup,
      total_income: totalIncome || 0,
      total_expense: totalExpense || 0,
      net: (totalIncome || 0) - (totalExpense || 0),
      current_month_income: monthlyIncome || 0,
      cash_balance: balance.balance,
    };
  }

  async getDailyList(center_id?: number, limit = 30) {
    const paymentWhere: any = { status: PaymentStatus.PAID };
    if (center_id) paymentWhere.center_id = center_id;

    const payments = await this.paymentModel.findAll({
      where: paymentWhere,
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('paid_at')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_income'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('paid_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('paid_at')), 'DESC']],
      raw: true,
    });

    const expenseWhere: any = {};
    if (center_id) expenseWhere.center_id = center_id;

    const expenses = await this.expenseModel.findAll({
      where: expenseWhere,
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('date')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_expense'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('date'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('date')), 'DESC']],
      raw: true,
    });

    const dateMap = new Map<string, { date: string; total_income: number; income_count: number; total_expense: number; expense_count: number }>();

    for (const p of payments as any[]) {
      const d = p.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, total_income: 0, income_count: 0, total_expense: 0, expense_count: 0 });
      }
      const entry = dateMap.get(d)!;
      entry.total_income = Number(p.total_income) || 0;
      entry.income_count = Number(p.count) || 0;
    }

    for (const e of expenses as any[]) {
      const d = e.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, total_income: 0, income_count: 0, total_expense: 0, expense_count: 0 });
      }
      const entry = dateMap.get(d)!;
      entry.total_expense = Number(e.total_expense) || 0;
      entry.expense_count = Number(e.count) || 0;
    }

    const result = Array.from(dateMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
      .map(d => ({
        ...d,
        net: d.total_income - d.total_expense,
      }));

    return result;
  }
}
