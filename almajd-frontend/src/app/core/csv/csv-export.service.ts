import { Injectable } from '@angular/core';

export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  download<T>(rows: T[], filename: string, columns: CsvColumn<T>[]): void {
    const header = columns.map(c => this.escape(c.header)).join(',');
    const body = rows.map(row =>
      columns.map(c => {
        const val = row[c.key];
        return this.escape(val == null ? '' : String(val));
      }).join(',')
    );
    const csv = [header, ...body].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private escape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }
}
