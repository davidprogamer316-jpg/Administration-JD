import ExcelJS from 'exceljs';
import { AccountingPeriod } from '../models';
import { CarJob } from '../../carJobs/models';

function formatMoney(n: number): string {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

export async function exportAccountingExcel(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<Buffer> {
  const query: Record<string, unknown> = {};
  if (filters?.startDate || filters?.endDate) {
    query.periodStartDate = {};
    if (filters.startDate) {
      (query.periodStartDate as Record<string, unknown>).$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (query.periodStartDate as Record<string, unknown>).$lte = new Date(filters.endDate);
    }
  }

  const periods = await AccountingPeriod.find(query).sort({ periodStartDate: -1 });

  const allEmployeeNames = [
    ...new Set(
      periods.flatMap((p) =>
        p.employeeDistribution.map((e) => e.employeeName)
      )
    ),
  ];

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Contabilidad');

  const headerStyle: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B1B2F' } },
    font: { color: { argb: 'D4A84B' }, bold: true, size: 11 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      bottom: { style: 'medium', color: { argb: 'D4A84B' } },
    },
  };

  const moneyFormat = '$#,##0.00';

  const headers = [
    'Periodo',
    'Ingresos',
    'Gastos',
    'DDDG',
    'Ganancia Empresa',
    'Neto a Repartir',
    ...allEmployeeNames,
    'Jefe',
    'Estado',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalDddg = 0;
  let totalProfit = 0;
  let totalNeto = 0;
  const totalEmployees: Record<string, number> = {};
  let totalBoss = 0;

  for (const p of periods) {
    const label = `Q${p.periodNumber} (${p.periodStartDate.toLocaleDateString('es-ES')} - ${p.periodEndDate.toLocaleDateString('es-ES')})`;

    const employeeAmounts = allEmployeeNames.map((name) => {
      const share = p.employeeDistribution.find(
        (e) => e.employeeName === name
      );
      return share?.amount || 0;
    });

    const row = ws.addRow([
      label,
      p.income,
      p.expenses,
      p.dddg,
      p.companyProfit,
      p.netToDistribute,
      ...employeeAmounts,
      p.bossAmount,
      p.closed ? 'Cerrado' : 'Abierto',
    ]);

    totalIncome += p.income;
    totalExpenses += p.expenses;
    totalDddg += p.dddg;
    totalProfit += p.companyProfit;
    totalNeto += p.netToDistribute;
    allEmployeeNames.forEach((name, i) => {
      totalEmployees[name] = (totalEmployees[name] || 0) + employeeAmounts[i];
    });
    totalBoss += p.bossAmount;

    const moneyColumns = [2, 3, 4, 5, 6];
    const employeeColStart = 7;
    const bossCol = employeeColStart + allEmployeeNames.length;

    row.eachCell((cell, colNumber) => {
      if (moneyColumns.includes(colNumber) || colNumber === bossCol) {
        cell.numFmt = moneyFormat;
      }
      if (
        colNumber >= employeeColStart &&
        colNumber < bossCol
      ) {
        cell.numFmt = moneyFormat;
      }
      cell.alignment = { horizontal: 'right' };
      cell.font = { size: 10 };
    });

    row.getCell(1).alignment = { horizontal: 'left' };
    row.getCell(headers.length).alignment = { horizontal: 'center' };

    if (periods.indexOf(p) % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F5F2ED' },
        };
      });
    }
  }

  const totalRow = ws.addRow([
    'TOTALES',
    totalIncome,
    totalExpenses,
    totalDddg,
    totalProfit,
    totalNeto,
    ...allEmployeeNames.map((name) => totalEmployees[name] || 0),
    totalBoss,
    '',
  ]);

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10 };
    cell.border = {
      top: { style: 'medium', color: { argb: 'D4A84B' } },
    };

    const moneyColumns = [2, 3, 4, 5, 6];
    const employeeColStart = 7;
    const bossCol = employeeColStart + allEmployeeNames.length;

    if (moneyColumns.includes(colNumber) || colNumber === bossCol) {
      cell.numFmt = moneyFormat;
    }
    if (colNumber >= employeeColStart && colNumber < bossCol) {
      cell.numFmt = moneyFormat;
    }
    cell.alignment = { horizontal: 'right' };
  });

  ws.columns = headers.map((_, i) => ({
    width: i === 0 ? 28 : 16,
  }));

  const ws2 = workbook.addWorksheet('Ganancias empleados');
  const empHeaders = ['Empleado', 'Periodo', 'Monto'];
  const empHeaderRow = ws2.addRow(empHeaders);
  empHeaderRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  ws2.columns = [
    { width: 24 },
    { width: 32 },
    { width: 16 },
  ];

  const sectionStyle: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2A2A45' } },
    font: { color: { argb: 'D4A84B' }, bold: true, size: 11 },
  };

  for (const name of allEmployeeNames) {
    const empPeriods = periods.filter((p) =>
      p.employeeDistribution.some((e) => e.employeeName === name)
    );

    if (empPeriods.length === 0) continue;

    const sectionRow = ws2.addRow([name, '', '']);
    sectionRow.eachCell((cell) => {
      cell.style = sectionStyle;
    });

    let empTotal = 0;

    for (const p of empPeriods) {
      const share = p.employeeDistribution.find(
        (e) => e.employeeName === name
      );
      const amount = share?.amount || 0;
      empTotal += amount;

      const row = ws2.addRow([
        '',
        `Q${p.periodNumber} (${p.periodStartDate.toLocaleDateString('es-ES')} - ${p.periodEndDate.toLocaleDateString('es-ES')})`,
        amount,
      ]);

      row.getCell(3).numFmt = moneyFormat;
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(2).font = { size: 10 };
      row.getCell(3).font = { size: 10 };

      if (empPeriods.indexOf(p) % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F5F2ED' },
          };
        });
      }
    }

    const subTotalRow = ws2.addRow(['', 'Total', empTotal]);
    subTotalRow.eachCell((cell, col) => {
      cell.font = { bold: true, size: 10 };
      cell.border = {
        top: { style: 'medium', color: { argb: 'D4A84B' } },
      };
      if (col === 3) {
        cell.numFmt = moneyFormat;
        cell.alignment = { horizontal: 'right' };
      }
    });

    ws2.addRow([]);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function exportCarJobsExcel(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<Buffer> {
  const query: Record<string, unknown> = {};
  if (filters?.startDate || filters?.endDate) {
    query.date = {};
    if (filters.startDate) {
      (query.date as Record<string, unknown>).$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (query.date as Record<string, unknown>).$lte = new Date(filters.endDate);
    }
  }

  const jobs = await CarJob.find(query).sort({ date: -1 });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Trabajos');

  const headerStyle: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B1B2F' } },
    font: { color: { argb: 'D4A84B' }, bold: true, size: 11 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      bottom: { style: 'medium', color: { argb: 'D4A84B' } },
    },
  };

  const headers = ['Fecha', 'VIN', 'Descripción', 'Pago', 'Estado'];
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  let totalPayment = 0;

  for (const job of jobs) {
    const row = ws.addRow([
      job.date.toLocaleDateString('es-ES'),
      job.vin,
      job.description,
      job.payment,
      job.closed ? 'Cerrado' : 'Abierto',
    ]);

    totalPayment += job.payment;

    row.getCell(4).numFmt = '$#,##0.00';
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };

    if (jobs.indexOf(job) % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F5F2ED' },
        };
      });
    }
  }

  const totalRow = ws.addRow(['TOTALES', '', '', totalPayment, '']);
  totalRow.eachCell((cell, col) => {
    cell.font = { bold: true, size: 10 };
    cell.border = {
      top: { style: 'medium', color: { argb: 'D4A84B' } },
    };
    if (col === 4) {
      cell.numFmt = '$#,##0.00';
      cell.alignment = { horizontal: 'right' };
    }
  });

  ws.columns = [
    { width: 14 },
    { width: 20 },
    { width: 40 },
    { width: 16 },
    { width: 12 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
