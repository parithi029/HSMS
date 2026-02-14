import { supabase } from '../lib/supabaseClient';
import { CATEGORY_OPTIONS, SEX_OPTIONS, DESTINATION_OPTIONS } from '../lib/shelterConstants';

export const ReportingService = {
    /**
     * Get occupancy distribution for a pie chart
     */
    async getOccupancyStats() {
        const { data, error } = await supabase
            .from('beds')
            .select('status');

        if (error) throw error;

        const stats = data.reduce((acc, bed) => {
            const status = bed.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(stats).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
        }));
    },

    /**
     * Get demographic breakdown by gender
     */
    async getGenderStats() {
        const { data, error } = await supabase
            .from('clients')
            .select('sex')
            .eq('is_active', true);

        if (error) throw error;

        const stats = data.reduce((acc, client) => {
            const genderValue = client.sex;
            // Map gender value to label
            const label = SEX_OPTIONS.find(opt => opt.value === genderValue)?.label || genderValue || 'Unknown';
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    },

    /**
     * Get demographic breakdown by category
     */
    async getCategoryStats() {
        const { data, error } = await supabase
            .from('clients')
            .select('category')
            .eq('is_active', true);

        if (error) throw error;

        const stats = data.reduce((acc, client) => {
            const catValue = client.category;
            // Map category value to label
            const label = CATEGORY_OPTIONS.find(opt => opt.value === parseInt(catValue))?.label || catValue || 'Other';
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    },

    /**
     * Get exit destination trends for bar chart
     */
    async getExitStats() {
        const { data, error } = await supabase
            .from('enrollments')
            .select('destination')
            .eq('is_active', false)
            .not('destination', 'is', null);

        if (error) throw error;

        const stats = data.reduce((acc, enroll) => {
            const destValue = enroll.destination;
            const label = DESTINATION_OPTIONS.find(opt => opt.value === destValue)?.label || `ID: ${destValue}`;
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        }, {});

        // Return top outcomes (up to 5) for better visualization
        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    },

    /**
     * Get bed assignment trends for the last 30 days
     */
    async getAssignmentTrends() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
            .from('bed_assignments')
            .select('start_date')
            .gte('start_date', thirtyDaysAgo.toISOString().split('T')[0]);

        if (error) throw error;

        // Group by date
        const trends = data.reduce((acc, item) => {
            const date = item.start_date;
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        // Fill in missing dates with 0
        const result = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            result.unshift({
                date: dateStr.split('-').slice(1).join('/'), // MM/DD for display
                count: trends[dateStr] || 0
            });
        }

        return result;
    }
};
