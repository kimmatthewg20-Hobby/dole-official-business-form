const { formatDateWording } = require('../public/js/date-wording');

// Shared by both tracker routes; formats one form for the tracker table.
async function formatTrackerEntry(entry, employees) {
  // Format date: mmm dd, yyyy (e.g., "Jan 15, 2024")
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      // Try parsing as ISO date first
      let date = new Date(dateStr);
      
      // If invalid, try parsing common formats
      if (isNaN(date.getTime())) {
        // Try MM/DD/YYYY or DD/MM/YYYY
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          // Assume MM/DD/YYYY format
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else {
          return dateStr; // Return original if can't parse
        }
      }
      
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = date.getDate();
      return `${months[date.getMonth()]} ${day}, ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };
  
  // Format time: HH:MM AM/PM
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      // Remove any existing AM/PM and whitespace
      let cleanTime = timeStr.trim().toUpperCase();
      const hasPeriod = cleanTime.includes('AM') || cleanTime.includes('PM');
      
      // Extract time part
      const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) return timeStr;
      
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2];
      
      // If already has AM/PM, use it; otherwise determine from hour
      let period = 'AM';
      if (hasPeriod) {
        period = cleanTime.includes('PM') ? 'PM' : 'AM';
      } else {
        period = hour >= 12 ? 'PM' : 'AM';
      }
      
      // Convert to 12-hour format
      if (hour === 0) {
        hour = 12;
      } else if (hour > 12) {
        hour = hour - 12;
      }
      
      return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
    } catch (e) {
      return timeStr;
    }
  };
  
  // Format time range: "HH:MM AM/PM to HH:MM AM/PM"
  const formatTimeRange = (departureTime, returnTime) => {
    const departure = formatTime(departureTime);
    const arrival = formatTime(returnTime);
    if (!departure && !arrival) return '-';
    if (!departure) return arrival;
    if (!arrival) return departure;
    return `${departure} to ${arrival}`;
  };
  
  // Get all dates from dates_of_ob or use date_of_ob
  let obDates = [];
  if (entry.dates_of_ob) {
    try {
      const dates = JSON.parse(entry.dates_of_ob);
      if (Array.isArray(dates) && dates.length > 0) {
        obDates = dates;
      }
    } catch (e) {
      // Use date_of_ob if parsing fails
    }
  }
  
  // If no dates from dates_of_ob, use date_of_ob
  if (obDates.length === 0 && entry.date_of_ob) {
    obDates = [entry.date_of_ob];
  }
  
  const dateOfOBDisplay = formatDateWording(obDates) || '-';
  
  return {
    id: entry.id,
    dateOfOB: dateOfOBDisplay,
    timeOfOB: formatTimeRange(entry.departure_time, entry.return_time),
    employees: employees.map(e => e.name).join(', '),
    purpose: entry.purpose || '',
    destination: `${entry.location_from || ''} - ${entry.location_to || ''}`,
    dateFiled: formatDate(entry.date_created || entry.timestamp)
  };
}

module.exports = { formatTrackerEntry };
