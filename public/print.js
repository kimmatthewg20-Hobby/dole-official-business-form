// Function to capitalize text (uppercase all letters)
function capitalizeText(text) {
  if (!text) return '';
  return String(text).toUpperCase();
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
  
  // If it's only one date, use the single date formatter
  if (dates.length === 1) return formatDate(dates[0]);
  
  // Format multiple dates and join them with commas
  const formattedDates = dates.map(date => formatDate(date)).join(', ');
  return formattedDates;
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
function generatePrintableHTML(data) {
  // Extract form data and employees
  const { formData, employees, settings } = data;
  
  // Create one form template for each employee
  let employeeForms = '';
  
  employees.forEach((employee, index) => {
    // Determine if we need a page break (after every 2 forms)
    const needsPageBreak = index > 0 && index % 2 === 0 ? 'page-break' : '';
    
    // Determine if this is an odd-numbered form (Form 1, 3, 5, etc.) - 0-indexed, so 0, 2, 4 are odd positions
    const isOddForm = index % 2 === 0;
    
    // Determine if this is an even-numbered form (Form 2, 4, 6, etc.) - 0-indexed, so 1, 3, 5 are even positions
    const isEvenForm = index % 2 === 1;
    
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
      approvedByPosition = formData.approvedByPosition || formData.approved_by_position || settings.office_head_position || 'Provincial Head';
    }
    
    // Create form for each employee
    employeeForms += `
      <div class="form-page ${needsPageBreak}">
        ${isOddForm ? '<br>' : ''}
        ${isEvenForm ? '<div class="cutout-line"></div>' : ''}
        <!-- Header -->
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
                <img src="https://batangmalaya.ph/wp-content/uploads/2022/12/1_dole.png" class="logo">
                <div class="header-text">
                  Republic of the Philippines<br>
                  DEPARTMENT OF LABOR AND EMPLOYMENT<br>
                  Intramuros, Manila
                </div>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Employee Info -->
        <table>
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
        
        <!-- Office Info -->
        <table>
          <tr>
            <td style="width: 33%;">
              Office:<br>
              <strong>${formData.division || formData.office || divisionDisplay || 'Department of Labor and Employment'}</strong>
            </td>
            <td style="width: 33%;">
              Division:<br>
              <strong>${divisionDisplay || formData.division || ''}</strong>
            </td>
            <td style="width: 34%;">
              Date of Official Business:<br>
              <strong>${dateDisplay}</strong>
            </td>
          </tr>
        </table>
        
        <!-- Itinerary -->
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
              ${formData.location_from || formData.locationFrom || ''}
            </td>
            <td style="width: 25%;" class="center-text">
              <strong>To</strong><br>
              ${formData.location_to || formData.locationTo || ''}
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
        
        <!-- Purpose -->
        <table>
          <tr>
            <td>
              <strong>Purpose:</strong><br>
              ${formData.purpose}
            </td>
          </tr>
        </table>
        
        <!-- Approval -->
        <table>
          <tr>
            <td style="width: 50%;" class="center-text approval-section">
              <div style="margin-top: 60px;"><strong>${capitalizeText(employee.name)}</strong></div>
              <div>Employee's Signature</div>
            </td>
            <td style="width: 50%;" class="center-text approval-section">
              <div style="text-align: left;"><strong>Approved by:</strong></div><br><br><br>
              <strong>${capitalizeText(approvedBy)}</strong><br>
              ${capitalizeText(approvedByPosition)}
            </td>
          </tr>
        </table>
        
        <!-- Certificate of Appearance -->
        <table>
          <tr>
            <td class="center-text" colspan="2" style="background-color: #F4F6F7; border-bottom: 2px solid #1ABC9C;">
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
        
        <!-- Instructions -->
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
    `;
  });
  
  // Create the complete HTML document
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Official Business Form - ${formData.travel_id}</title>
      <link rel="icon" href="https://batangmalaya.ph/wp-content/uploads/2022/12/1_dole.png" type="image/png">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          margin: 0;
          padding: 0;
          font-size: 12px;
          background-color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: -1px;
        }
        table, th, td {
          border: 1px solid #2C3E50;
        }
        th, td {
          padding: 5px;
          text-align: left;
        }
        .header-left {
          width: 25%;
          text-align: left;
          vertical-align: middle;
          font-weight: bold;
        }
        .header-center {
          width: 50%;
          text-align: center;
          vertical-align: middle;
          font-weight: bold;
        }
        .header-right {
          width: 10%;
          text-align: center;
          vertical-align: middle;
        }
        .logo {
          width: 40px;
          height: auto;
          margin-left: 10px;
          margin-right: 10px;
        }
        .header-right-content {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
        }
        .header-text {
          text-align: center;
          white-space: nowrap;
          line-height: 1.2;
          font-size: 12px;
        }
        .center-text {
          text-align: center;
        }
        .approval-section {
          height: 80px;
        }
        .certificate-section {
          height: 100px;
        }
        .instructions {
          font-size: 10px;
        }
        .cutout-line {
          width: 100%;
          height: 0;
          border-top: 1px dashed #000;
          margin: 0;
          padding: 3px 0;
        }
        .form-page {
          width: 8.5in;
          padding: 5px 0.4cm;
          box-sizing: border-box;
          overflow: hidden;
          margin-left: auto;
          margin-right: auto;
        }
        .page-break {
          page-break-before: always;
        }
        .print-button {
          position: fixed;
          top: 25px;
          left: 25px;
          padding: 10px 20px;
          background-color: #2C3E50;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          z-index: 1000;
          font-size: 14px;
          font-weight: 500;
        }
        .print-button:hover {
          background-color: #3498DB;
        }
        @media print {
          .print-button {
            display: none;
          }
          @page {
            size: 8.5in 13.5in;
            margin: 0;
          }
          body {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .form-page {
            padding: 5px 0.3cm;
            width: 8.5in;
            max-height: calc((13.5in - 0.6cm) / 2);
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: avoid;
            page-break-inside: avoid;
            margin-left: auto;
            margin-right: auto;
            display: flex;
            flex-direction: column;
          }
          .form-page table {
            font-size: 11px;
          }
          .form-page th, .form-page td {
            padding: 4px;
          }
          .approval-section {
            height: 60px;
            min-height: 60px;
          }
          .certificate-section {
            height: 80px;
            min-height: 80px;
          }
          .instructions {
            font-size: 9px;
            line-height: 1.2;
          }
          /* Ensure 2 forms per page - break after every 2nd form */
          .form-page:nth-of-type(2n) {
            page-break-after: always;
          }
          .form-page:nth-of-type(2n+1) {
            page-break-after: avoid;
          }
          /* Prevent orphaned forms - if only 1 form left, keep with previous */
          .form-page:last-child:nth-of-type(odd) {
            page-break-before: auto;
            page-break-after: avoid;
          }
          /* Prevent blank pages by ensuring proper page break handling */
          .form-page.page-break {
            page-break-before: always;
          }
          /* Cutout line styling for printing */
          .cutout-line {
            border-top: 1px dashed #000;
            margin: 0.1in 0;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-button" onclick="window.print()">Print Form</button>
      ${employeeForms}
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