/**
 * HUD CSV Export Utilities
 * Handles generation and download of CSV files for HMIS reporting.
 */

export const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    // 1. Extract headers
    const headers = Object.keys(data[0]);

    // 2. Build rows
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(header => {
                const val = row[header];
                // Handle nulls, commas in text, and booleans
                if (val === null || val === undefined) return '';
                if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
                return val;
            }).join(',')
        )
    ];

    // 3. Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportHUDData = async (supabase, tableName = 'clients', showToast) => {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) throw error;

        const date = new Date().toISOString().split('T')[0];
        downloadCSV(data, `HMIS_Export_${tableName}_${date}.csv`);
        if (showToast) showToast(`Successfully exported ${tableName} to CSV.`, 'success');
    } catch (error) {
        console.error('Export failed:', error);
        if (showToast) {
            showToast('Export failed: ' + error.message, 'error');
        }
    }
};
