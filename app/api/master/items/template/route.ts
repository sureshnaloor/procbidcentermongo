import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';
import { collections } from '@/lib/db';
import { ensureDefaults } from '@/lib/seed-defaults';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  await ensureDefaults();
  const { materialServiceGroups, materialServiceTypes } = await collections();

  const types = await materialServiceTypes.find({}).toArray();
  const typeMap = new Map(types.map((t) => [t._id!.toString(), t]));
  const groups = await materialServiceGroups.find({}).sort({ name: 1 }).toArray();

  const rows: (string | number)[][] = [
    ['Group Name', 'Item Code', 'Description', 'Unit', 'Type Name (Optional)'],
    ['Cables LV', 'CAB-LV-4C16-ARM', '4 Core 16 sq mm XLPE Armoured Power Cable 1.1kV', 'MTR', 'Electrical'],
    ['Cables HV', 'CAB-HV-3C95-XLPE', '3 Core 95 sq mm 11kV E grade XLPE Power Cable', 'MTR', 'Electrical'],
    ['Glands', 'GLD-BR-M20-EXD', 'Brass Double Compression Cable Gland M20 Ex d / Ex e', 'NOS', 'Electrical'],
    ['Lugs', 'LUG-CU-16-M8', 'Heavy Duty Copper Compression Terminal Lug 16 sq mm Hole M8', 'NOS', 'Electrical'],
    ['Switchgear & MCC', 'SWG-ACB-1600A-4P', 'Air Circuit Breaker 1600A 4 Pole 65kA Microprocessor Trip', 'NOS', 'Electrical'],
    ['Valves & Actuators', 'VLV-BL-2IN-150-CS', '2" Class 150 Flanged CS Body Ball Valve with Lever', 'NOS', 'Mechanical'],
    ['Pipes & Fittings', 'PIP-CS-SCH40-4IN', '4" Carbon Steel Seamless Pipe API 5L Gr.B SCH 40', 'MTR', 'Mechanical'],
    ['Structural Steel', 'STL-UB-203-133-25', 'Universal Beam 203 x 133 x 25 kg/m S355JR', 'MTR', 'Civil'],
    ['Transmitters & Gauges', 'XMT-PT-0-10BAR-420', 'Pressure Transmitter 0-10 Bar Gauge 4-20mA HART Ex ia', 'NOS', 'Instrumentation'],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 28 }, // Group Name
    { wch: 22 }, // Item Code
    { wch: 65 }, // Description
    { wch: 10 }, // Unit
    { wch: 24 }, // Type Name
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Materials');

  // Available Groups reference sheet
  const groupRows: (string | number)[][] = [
    ['Group Name', 'Discipline / Type Name', 'Category', 'Description'],
    ...groups.map((g) => {
      const parentType = typeMap.get(g.typeId.toString());
      return [
        g.name,
        parentType?.name || '',
        parentType?.category || '',
        g.description || '',
      ];
    }),
  ];

  const wsGroups = XLSX.utils.aoa_to_sheet(groupRows);
  wsGroups['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 12 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsGroups, 'Available Groups');

  // Instructions sheet
  const instructions: (string | number)[][] = [
    ['ProcBid Center - Materials & Items Bulk Upload Instructions'],
    [''],
    ['Column Name', 'Required', 'Description & Accepted Values'],
    ['Group Name', 'Yes', 'The exact group name this item belongs to (refer to the "Available Groups" sheet).'],
    ['Item Code', 'Yes', 'Unique identification code for the item/material (e.g., CAB-LV-4C16-ARM, GLD-BR-M20). Unique within its group.'],
    ['Description', 'Yes', 'Full technical description of the material/service item.'],
    ['Unit', 'No', 'Unit of measurement (e.g., MTR, NOS, KG, SET, LOT, SQM).'],
    ['Type Name', 'No', 'Optional. Used to disambiguate if two groups have the same name in different types.'],
    [''],
    ['Notes:'],
    ['- If an item with the same code already exists in the group, its description and unit will be updated.'],
    ['- If the Group Name does not exist, upload or create the Group first.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="ProcBid-Materials-Template.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
