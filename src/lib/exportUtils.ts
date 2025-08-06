import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AzureIpAddress } from '@/types/azure';

// IE11 navigator extension
interface ExtendedNavigator extends Navigator {
  msSaveBlob?: (blob: Blob, filename: string) => void;
}

export interface ExportOptions {
  query?: string;
  region?: string;
  service?: string;
  format: 'csv' | 'xlsx';
  filename?: string;
}

/**
 * Generate a descriptive filename for the export
 */
function generateFilename(options: ExportOptions): string {
  if (options.filename) {
    return options.filename;
  }

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const parts = ['azure-ip-export'];
  
  if (options.query) {
    // Clean up the query for filename - remove special characters
    const cleanQuery = options.query.replace(/[^a-zA-Z0-9.-]/g, '_');
    parts.push(cleanQuery);
  }
  
  if (options.service) {
    const cleanService = options.service.replace(/[^a-zA-Z0-9.-]/g, '_');
    parts.push(cleanService);
  }
  
  if (options.region) {
    const cleanRegion = options.region.replace(/[^a-zA-Z0-9.-]/g, '_');
    parts.push(cleanRegion);
  }
  
  parts.push(date);
  
  return `${parts.join('-')}.${options.format}`;
}

/**
 * Convert Azure IP data to export format
 */
function convertDataForExport(data: AzureIpAddress[]): Record<string, string>[] {
  return data.map(item => ({
    'Service Tag': item.serviceTagId || '',
    'IP Range': item.ipAddressPrefix || '',
    'Region': item.region || '',
    'System Service': item.systemService || '',
    'Network Features': item.networkFeatures || '',
    'Region ID': item.regionId || ''
  }));
}


/**
 * Export data as CSV
 */
export function exportAsCSV(data: AzureIpAddress[], options: ExportOptions): void {
  try {
    const convertedData = convertDataForExport(data);
    
    const csv = Papa.unparse(convertedData, {
      header: true,
      skipEmptyLines: true
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = generateFilename(options);
    
    const extendedNavigator = navigator as ExtendedNavigator;
    if (extendedNavigator.msSaveBlob) {
      // IE 10+
      extendedNavigator.msSaveBlob(blob, filename);
    } else {
      // Other browsers
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error('Failed to export data as CSV');
  }
}

/**
 * Export data as Excel
 */
export function exportAsExcel(data: AzureIpAddress[], options: ExportOptions): void {
  try {
    const convertedData = convertDataForExport(data);
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(convertedData);
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 25 }, // Service Tag
      { wch: 20 }, // IP Range
      { wch: 15 }, // Region
      { wch: 20 }, // System Service
      { wch: 15 }, // Network Features
      { wch: 12 }  // Region ID
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Azure IP Data');
    
    // Generate filename and download
    const filename = generateFilename(options);
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    throw new Error('Failed to export data as Excel');
  }
}

/**
 * Main export function that delegates to the appropriate format handler
 */
export function exportData(data: AzureIpAddress[], options: ExportOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (options.format === 'csv') {
        exportAsCSV(data, options);
      } else if (options.format === 'xlsx') {
        exportAsExcel(data, options);
      } else {
        throw new Error(`Unsupported export format: ${options.format}`);
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}