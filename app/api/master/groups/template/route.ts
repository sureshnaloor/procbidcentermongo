import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const category = req.nextUrl.searchParams.get('category') || 'all';

  const rows: (string | number)[][] = [
    ['Category', 'Type Name', 'Group Name', 'Description'],
    ['material', 'Electrical', 'Cables LV', 'Low voltage power, control, and instrumentation cables'],
    ['material', 'Electrical', 'Cables HV', 'Medium and high voltage (3.3kV to 33kV+) power cables'],
    ['material', 'Electrical', 'Glands', 'Brass, stainless steel, and flameproof Ex d/Ex e cable glands'],
    ['material', 'Electrical', 'Lugs', 'Copper compression cable lugs, bimetallic terminals, and ferrules'],
    ['material', 'Electrical', 'Switchgear & Panels', 'LV/MV switchboards, motor control centers, and breaker panels'],
    ['material', 'Mechanical', 'Valves & Actuators', 'Gate, globe, ball, check valves and actuators'],
    ['material', 'Mechanical', 'Pipes & Fittings', 'CS, SS, duplex pipes, flanges, and piping fittings'],
    ['material', 'Civil', 'Structural Steel', 'Beams, columns, channels, angles, plates, and grating'],
    ['service', 'Civil & Construction', 'Piling & Deep Foundations', 'Cast-in-situ bored piling and equipment foundations'],
    ['service', 'Mechanical Services', 'Piping Fabrication & Erection', 'Spool fabrication, field weld erection, and hydrotesting'],
    ['service', 'Electrical Services', 'Cable Laying & Termination', 'Cable tray installation, pulling, glanding, and testing'],
  ];

  // If specific category requested, filter rows (keeping header)
  const filteredRows = category === 'material' || category === 'service'
    ? [rows[0]!, ...rows.slice(1).filter((r) => r[0] === category)]
    : rows;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(filteredRows);

  ws['!cols'] = [
    { wch: 14 }, // Category
    { wch: 24 }, // Type Name
    { wch: 28 }, // Group Name
    { wch: 60 }, // Description
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Groups');

  const instructions: (string | number)[][] = [
    ['ProcBid Center - Master Groups Bulk Upload Instructions'],
    [''],
    ['Column Name', 'Required', 'Description & Accepted Values'],
    ['Category', 'Yes', 'Must be either "material" or "service" (case-insensitive)'],
    ['Type Name', 'Yes', 'The root taxonomy discipline (e.g., Electrical, Mechanical, Civil). If it does not exist, it will be automatically created.'],
    ['Group Name', 'Yes', 'The granular group (e.g., Glands, Lugs, Cables HV, Valves). Unique within its Type.'],
    ['Description', 'No', 'Optional description of the group.'],
    [''],
    ['Notes:'],
    ['- Existing groups with the same name under the same Type will have their description updated without duplication.'],
    ['- You can upload .xlsx, .xls, or .csv files.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = category === 'material'
    ? 'ProcBid-Material-Groups-Template.xlsx'
    : category === 'service'
    ? 'ProcBid-Service-Groups-Template.xlsx'
    : 'ProcBid-Groups-Template.xlsx';

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
