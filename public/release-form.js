// Function to generate the release form HTML
function generateReleaseFormHTML(data) {
  // Extract form data and employees
  const { formData, employees } = data;
  
  // Create rows for employees
  let employeeRows = '';
  
  // First, organize employees by their ob_id
  const employeesByObId = {};
  employees.forEach(employee => {
    const obId = employee.ob_id;
    if (!employeesByObId[obId]) {
      employeesByObId[obId] = [];
    }
    employeesByObId[obId].push(employee);
  });
  
  // Need to get form data for each ob_id
  const obIds = Object.keys(employeesByObId);
  let employeeNumber = 1;
  
  // If we have form data for each ob_id (from server query)
  if (data.formDataMap) {
    // Loop through each form and its employees
    obIds.forEach(obId => {
      const formDataForThisOb = data.formDataMap[obId] || formData;
      const employeesForThisOb = employeesByObId[obId] || [];
      
      employeesForThisOb.forEach(employee => {
        // Get destination from the form data for this specific employee
        const destination = formDataForThisOb.location_to || formDataForThisOb.locationTo || '';
        
        // Get date display from employee's form data
        let dateDisplay = '';
        
        // Changed the priority order - check dates_of_ob first
        if (formDataForThisOb.dates_of_ob) {
          try {
            const datesArray = JSON.parse(formDataForThisOb.dates_of_ob);
            if (Array.isArray(datesArray) && datesArray.length > 0) {
              dateDisplay = datesArray.join(', ');
            }
          } catch (e) {
            console.error('Error parsing dates_of_ob:', e);
            // Fallback to date_of_ob if parsing fails
            dateDisplay = formDataForThisOb.date_of_ob || '';
          }
        } else if (formDataForThisOb.date_of_ob) {
          dateDisplay = formDataForThisOb.date_of_ob;
        } else if (formDataForThisOb.dateStr) {
          dateDisplay = formDataForThisOb.dateStr;
        }
        
        // Add row for this employee
        employeeRows += `
          <tr class="data-row">
            <td>${employeeNumber}</td>
            <td>${employee.name} (${employee.position})</td>
            <td>${destination}</td>
            <td>${dateDisplay}</td>
            <td>${employeeNumber}</td>
            <td></td>
          </tr>
        `;
        
        employeeNumber++;
      });
    });
  } else {
    // Fallback to the old behavior if we don't have form data for each ob_id
    employees.forEach((employee, index) => {
      // Get the employee number (1-based index)
      const empNumber = index + 1;
      
      // Get date display from employee or form data
      let dateDisplay = '';
      
      // Changed the priority order - check dates_of_ob first
      if (formData.dates_of_ob) {
        try {
          const datesArray = JSON.parse(formData.dates_of_ob);
          if (Array.isArray(datesArray) && datesArray.length > 0) {
            dateDisplay = datesArray.join(', ');
          }
        } catch (e) {
          console.error('Error parsing dates_of_ob:', e);
          // Fallback to single date if parsing fails
          dateDisplay = employee.dateOfOB || formData.date_of_ob || '';
        }
      } else if (employee.dateOfOB) {
        dateDisplay = employee.dateOfOB;
      } else if (formData.dateStr) {
        dateDisplay = formData.dateStr;
      }
      
      // Get destination
      const destination = formData.location_to || formData.locationTo || '';
      
      // Add row for each employee
      employeeRows += `
        <tr class="data-row">
          <td>${empNumber}</td>
          <td>${employee.name} (${employee.position})</td>
          <td>${destination}</td>
          <td>${dateDisplay}</td>
          <td>${empNumber}</td>
          <td></td>
        </tr>
      `;
    });
  }
  
  // Fill empty rows to make sure we have at least 15 rows
  const currentRows = employees.length;
  if (currentRows < 20) {
    for (let i = currentRows + 1; i <= 20; i++) {
      employeeRows += `
        <tr class="data-row">
          <td>${i}</td>
          <td></td>
          <td></td>
          <td></td>
          <td>${i}</td>
          <td></td>
        </tr>
      `;
    }
  }
  
  // Create the complete HTML document
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Released Form</title>
      <link rel="icon" href="doleit_logo.png" type="image/png">
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
        .header {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          padding: 10px;
        }
        .subheader {
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          padding: 5px;
        }
        .center-text {
          font-weight: 600;
          background-color: #F4F6F7;
          text-align: center;
          border-bottom: 2px solid #3498DB;
        }
        .form-page {
          width: 8.5in;
          padding: 0.4cm;
          box-sizing: border-box;
          overflow: hidden;
          margin: 0 auto;
        }
        .period-row td {
          font-weight: bold;
        }
        .print-button {
          position: fixed;
          top: 25px;
          right: 25px;
          padding: 10px 18px;
          background-color: #2C3E50;
          color: #ffffff;
          border: none;
          border-radius: 0;
          cursor: pointer;
          z-index: 1000;
          font-size: 14px;
          font-weight: 500;
        }
        .print-button:hover {
          background-color: #3498DB;
        }
        .data-row td {
          padding-top: 0.3cm;
          padding-bottom: 0.3cm;
        }
        @media print {
          .print-button {
            display: none;
          }
          @page {
            size: 8in 13in;
            margin: 0;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .form-page {
            padding: 0.3cm;
            height: auto;
            page-break-after: avoid;
            margin: 0 auto;
            margin-top: 0.25cm;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-button" onclick="window.print()">Print Form</button>
      <div class="form-page">
        <table>
          <tr>
            <td colspan="6" class="header">
              <div style="display: flex; align-items: center; justify-content: center;">
                <img src="doleit_logo.png" style="width: 40px; height: auto; margin-right: 10px;">
                RECORDS APPROVED OFFICIAL BUSINESS<br>
                RELEASED FORM
              </div>
            </td>
          </tr>
          <tr class="period-row">
            <td colspan="6">Months/Period:</td>
          </tr>
          <tr>
            <td style="width: 5%;" class="center-text">No.</td>
            <td style="width: 20%;" class="center-text">Name (Position)</td>
            <td style="width: 25%;" class="center-text">Destination</td>
            <td style="width: 8%;" class="center-text">Date of Official Business</td>
            <td style="width: 15%;" class="center-text">Signature</td>
            <td style="width: 8%;" class="center-text">Date Received</td>
          </tr>
          ${employeeRows}
        </table>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

// Export the function for use in the server
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateReleaseFormHTML
  };
} 