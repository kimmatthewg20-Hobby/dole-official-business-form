const { formatDateWording } = require('./js/date-wording');
const { PRINT_STYLES, CUT_GUIDE_HTML } = require('./print-styles');
const { SIGNATURE_COMMENT } = require('./signature');
const { DEFAULT_PAPER, toolbarHtml } = require('./print-papers');
const { printedForms } = require('./print-pages');

// Forms are printed and shown to others, so user text must never be read as markup.
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Function to capitalize text (uppercase all letters)
function capitalizeText(text) {
  if (!text) return '';
  return escapeHtml(String(text).toUpperCase());
}

// Function to format date in Month DD, YYYY format
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Date format error';
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch (e) {
    return 'Date format error';
  }
}

// Function to format multiple dates
function formatMultipleDates(dates) {
  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return '';
  }
  return formatDateWording(dates);
}

// Function to format time in HH:MM AM/PM format
function formatTime(timeString) {
  if (!timeString) return '';
  
  // If the timeString is in 24-hour format (HH:MM), convert it to 12-hour format
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours));
  date.setMinutes(parseInt(minutes));
  
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Function to generate the printable HTML
const FORMS_PER_SHEET = 2;

// Groups the forms two to a sheet, so the screen shows the paper and the printer breaks per sheet.
function sheetsHtml(formPages) {
  const sheets = [];
  for (let start = 0; start < formPages.length; start += FORMS_PER_SHEET) {
    sheets.push(`<section class="sheet">${formPages.slice(start, start + FORMS_PER_SHEET).join(CUT_GUIDE_HTML)}</section>`);
  }
  return sheets.join('');
}

function generatePrintableHTML(data) {
  // Extract form data and employees
  const { formData, employees, settings } = data;
  
  // The stored Date mode decides the printed forms; every FORMS_PER_SHEET share one sheet of paper.
  const formPages = [];
  
  printedForms(formData, employees).forEach(({ employee, dates }) => {
    // Get date display - handle multiple dates or single date with improved checks
    let dateDisplay = '';
    
    // Try to extract dates from different possible sources
    let datesArray = null;
    
    // First, try to parse the dates_of_ob from the database
    if (formData.dates_of_ob) {
      try {
        datesArray = JSON.parse(formData.dates_of_ob);
      } catch (e) {
        // Silently handle parse error
        console.error('Error parsing dates_of_ob:', e);
      }
    }
    
    // If still empty, check if datesOfOB array already exists
    if (!datesArray && formData.datesOfOB && Array.isArray(formData.datesOfOB)) {
      datesArray = formData.datesOfOB;
    }
    
    // Check if dateStr contains multiple comma-separated dates (from flatpickr)
    if (!datesArray && formData.dateStr && formData.dateStr.includes(',')) {
      // This is already a formatted string from flatpickr, use it directly
      dateDisplay = formData.dateStr;
    }
    // Check for selectedDatesValues which might be a JSON string
    else if (!datesArray && formData.selectedDatesValues) {
      try {
        const parsedDates = JSON.parse(formData.selectedDatesValues);
        if (Array.isArray(parsedDates) && parsedDates.length > 0) {
          datesArray = parsedDates;
        }
      } catch (e) {
        // Silently handle parse error
      }
    }
    
    // Format the dates array if we found one
    if (datesArray && datesArray.length > 0) {
      dateDisplay = formatMultipleDates(datesArray);
    }
    
    // Final fallbacks to various other possible date formats
    if (!dateDisplay) {
      dateDisplay = formatDate(formData.date) || 
                   formatDate(formData.dateOfBusiness) || 
                   formatDate(formData.dateOfOB) ||
                   formatDate(formData.date_of_ob) || '';
    }
    
    // Emergency fallback when all date fields are missing
    if (!dateDisplay && formData.dateStr) {
      // Just use the raw string as last resort
      dateDisplay = formData.dateStr;
    }
    
    // Absolute emergency fallback - if we have no date at all
    if (!dateDisplay) {
      // Try to find any property with 'date' in its name
      for (const key in formData) {
        if (key.toLowerCase().includes('date') && formData[key]) {
          if (typeof formData[key] === 'string') {
            dateDisplay = formData[key];
            break;
          } else if (Array.isArray(formData[key]) && formData[key].length > 0) {
            dateDisplay = formatMultipleDates(formData[key]);
            break;
          } else if (typeof formData[key] === 'object' && formData[key] !== null) {
            dateDisplay = JSON.stringify(formData[key]);
            break;
          }
        }
      }
      
      if (!dateDisplay) {
        dateDisplay = "Date information missing";
      }
    }
    
    // A Separated Dates form prints only its own date.
    if (dates) dateDisplay = formatMultipleDates(dates);

    // Get employee info from employees_directory if available
    const employeeInfo = employee.directory_info || {};
    
    // Check if employee is from Provincial Head unit
    const isProvincialHead = (employeeInfo.assigned_unit === 'PROVINCIAL HEAD');
    
    // Set division and approval info based on employee's assigned_unit
    let divisionDisplay = '';
    let approvedBy = '';
    let approvedByPosition = '';
    
    if (isProvincialHead) {
      // For Provincial Head, use special division and approval settings
      divisionDisplay = 'Department of Labor and Employment';
      approvedBy = settings.assistant_regional_director || 'ATTY. NEPOMUCENO A. LEAÑO II, CPA';
      approvedByPosition = 'Assistant Regional Director';
    } else {
      // For other employees, use their assigned unit as division
      divisionDisplay = employeeInfo.assigned_unit || formData.division || '';
      approvedBy = formData.approvedBy || formData.approved_by || settings.office_head || '';
      // Printed as the admin entered it in the Approver list, capitals and all.
      approvedByPosition = formData.approvedByPosition || formData.approved_by_position || settings.office_head_position || 'Provincial Head';
    }
    
    // Create one printed form
    formPages.push(`
      <div class="form-page">
        <table>
          <tr>
            <td class="header-left">
              HRDSPAD<br>
              Form No. 07<br>
              <div style="font-size: 10px;">(Revised, January 2015)</div>
            </td>
            <td class="header-center">
              OFFICIAL BUSINESS FORM
            </td>
            <td class="header-right">
              <div class="header-right-content">
                <img src="/dole-bicol-logo.svg" alt="DOLE Bicol logo" class="logo">
                <div class="header-text">
                  Republic of the Philippines<br>
                  DEPARTMENT OF LABOR AND EMPLOYMENT<br>
                  Regional Office No. 5<br>
                  Legazpi City
                </div>
              </div>
            </td>
          </tr>
        </table>
        
        <table class="roomy">
          <tr>
            <td style="width: 50%;">
              Name of Employee:<br>
              <strong>${capitalizeText(employee.name)}</strong>
            </td>
            <td style="width: 50%;">
              Position:<br>
              <strong>${capitalizeText(employee.position)}</strong>
            </td>
          </tr>
        </table>
        
        <table>
          <tr>
            <td style="width: 33%;">
              Office:<br>
              <strong>Department of Labor and Employment</strong>
            </td>
            <td style="width: 33%;">
              Division:<br>
              <strong>${escapeHtml(divisionDisplay || formData.division || '')}</strong>
            </td>
            <td style="width: 34%;">
              Date of Official Business:<br>
              <strong>${escapeHtml(dateDisplay)}</strong>
            </td>
          </tr>
        </table>
        
        <table>
          <tr>
            <td colspan="2" class="center-text">
              <strong>Itinerary/Destination</strong>
            </td>
            <td colspan="2" class="center-text">
              <strong>Time</strong>
            </td>
          </tr>
          <tr>
            <td style="width: 25%;" class="center-text">
              <strong>From</strong><br>
              ${escapeHtml(formData.location_from || formData.locationFrom || '')}
            </td>
            <td style="width: 25%;" class="center-text">
              <strong>To</strong><br>
              ${escapeHtml(formData.location_to || formData.locationTo || '')}
            </td>
            <td style="width: 25%;" class="center-text">
              <strong>Departure</strong><br>
              ${formatTime(formData.departure_time || formData.departureTime || '')}
            </td>
            <td style="width: 25%;" class="center-text">
              <strong>Expected Return</strong><br>
              ${formatTime(formData.return_time || formData.returnTime || '')}
            </td>
          </tr>
        </table>
        
        <table>
          <tr>
            <td>
              <strong>Purpose:</strong><br>
              ${escapeHtml(formData.purpose)}
            </td>
          </tr>
        </table>
        
        <table class="roomy">
          <tr>
            <td style="width: 50%;" class="center-text approval-section">
              <div style="margin-top: 40px;"><strong>${capitalizeText(employee.name)}</strong></div>
              <div>Employee's Signature</div>
            </td>
            <td style="width: 50%;" class="center-text approval-section">
              <div style="text-align: left;"><strong>Approved by:</strong></div><br><br>
              <strong>${capitalizeText(approvedBy)}</strong><br>
              ${escapeHtml(approvedByPosition)}
            </td>
          </tr>
        </table>
        
        <table>
          <tr>
            <td class="center-text" colspan="2" style="background-color: #F4F6F7; border-bottom: 2px solid #000000;">
              <strong>TO BE FILLED BY THE AGENCY OR COMPANY WHERE BUSINESS IS TRANSACTED</strong>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="certificate-section">
                <div style="text-align: center;"><strong>CERTIFICATE OF APPEARANCE</strong></div>
            <p style="margin-left: 40px; margin-right: 40px; text-indent: 70px;">
                This is to certify that the person whose name is shown above personally appeared in this office as indicated and for the purpose stated.
            </p>
              <br><br>
              <div style="text-align: center;">
                <div style="width: 80%; margin: 0 auto; border-top: 1px solid black;"></div>
                <div>Signature over Printed Name of Officer or Authorized Signatory and Designation</div>
              </div>
            </td>
          </tr>
        </table>
        
        <table>
          <tr>
            <td class="instructions">
              <strong>INSTRUCTIONS:</strong><br>
              <ol>
                <li>Employees are required to accomplish an official business (OB) form prior to their participation and/or attendance to official functions such as meetings, field assignment. Approved/signed OB slips must be attached to the DTRs/bundy cards upon submission to the Human Resource Development Service (HRDS) or the Personnel Unit of the Internal Management Services Division (IMSD) of each regional office.<br>
                Employees who attended trainings or seminars are required to submit a copy of their certificate of attendance/appearance to such in lieu of the OB form.</li>
                <li>An OB is applicable only for <strong>one (1) day</strong> regardless of the duration and/or start/end time of the business, except warranted.</li>
                <li>Failure to submit the duly approved OB forms or certificate of attendance/appearance shall be a ground for deduction from the vacation leave credits. Such deduction shall be counted as tardiness, undertime or whole day absence, whichever is applicable.</li>
                <li>Employees must ensure that the Certificate of Appearance in this form is duly signed by the agency or company where business is transacted.</li>
              </ol>
            </td>
          </tr>
        </table>
      </div>
    `);
  });

  const employeeForms = sheetsHtml(formPages);
  
  // Create the complete HTML document
  const html = `
    <!DOCTYPE html>
    <html lang="en" data-paper="${DEFAULT_PAPER}">
    <head>
      ${SIGNATURE_COMMENT}
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Official Business Form - ${escapeHtml(formData.id)}</title>
      <link rel="icon" type="image/svg+xml" href="/dole-bicol-logo.svg">
      <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">
      <style>${PRINT_STYLES}</style>
      <style id="pageSize"></style>
    </head>
    <body>
      ${toolbarHtml({ title: 'Official Business Form', formNumber: `Form No. ${escapeHtml(formData.id)}` })}
      ${employeeForms}
      <script src="/js/print-fit.js"></script>
      <script src="/js/print-toolbar.js"></script>
    </body>
    </html>
  `;
  
  return html;
}

// Export the function for use in the server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generatePrintableHTML
  };
} 