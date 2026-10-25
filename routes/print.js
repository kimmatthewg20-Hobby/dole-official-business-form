const express = require('express');
const db = require('../db');

const { generatePrintableHTML } = require('../public/print');
const { withoutReferenceCode } = require('./reference-code');
const router = express.Router();

// Print route - generates and serves the printable HTML
router.get('/print/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    console.log(`Generating print form for id: ${id}`);
    
    // Printouts are posted and passed around, so the Reference code never reaches the page.
    const formData = withoutReferenceCode(await db.get(`SELECT * FROM official_business WHERE id = ?`, [id]));
    
    if (!formData) {
      console.error('Form not found for id:', id);
      return res.status(404).send('Form not found');
    }
    
    // Parse the dates_of_ob field if it exists
    if (formData.dates_of_ob) {
      try {
        formData.datesOfOB = JSON.parse(formData.dates_of_ob);
        console.log('Parsed dates for print:', formData.datesOfOB);
        
        // Validate the parsed dates
        if (!Array.isArray(formData.datesOfOB)) {
          console.error('Parsed dates are not an array, fixing:', formData.datesOfOB);
          formData.datesOfOB = [formData.date_of_ob];
        }
      } catch (e) {
        console.error('Error parsing dates in print route:', e);
        // If parsing fails, create a single-item array with the date_of_ob value
        formData.datesOfOB = [formData.date_of_ob];
      }
    } else if (formData.date_of_ob) {
      // If no dates_of_ob exists but there's a single date, use that
      formData.datesOfOB = [formData.date_of_ob];
      console.log('Using single date for print:', formData.datesOfOB);
    } else {
      // If no dates at all, use today's date
      const today = new Date().toISOString().split('T')[0];
      formData.datesOfOB = [today];
      formData.date_of_ob = today;
      console.log('No dates found, using today:', today);
    }
    
    // Get associated employees
    let employees = await db.all('SELECT name, position FROM employees WHERE ob_id = ?', [formData.id]);
    
    // Ensure employees is always an array
    employees = employees || [];
    
    // If no employees found, create a dummy entry
    if (employees.length === 0) {
      console.warn('No employees found for form, adding placeholder');
      employees.push({
        name: 'Employee Name Not Found',
        position: 'Position Not Found'
      });
    }
    
    // Get settings
    const settings = await db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', []) || {};
    
    // Look up employee information from directory
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      try {
        const employee_info = await db.get(
          `SELECT * FROM employees_directory WHERE full_name LIKE ? OR firstname || ' ' || last_name LIKE ?`,
          [`%${emp.name}%`, `%${emp.name}%`]
        );
        
        if (employee_info) {
          employees[i].directory_info = employee_info;
        }
      } catch (err) {
        console.error(`Error looking up employee ${emp.name} in directory:`, err);
      }
    }
    
    // Generate the printable HTML
    const htmlContent = generatePrintableHTML({
      formData,
      employees,
      settings
    });
    
    // Send the HTML response
    res.send(htmlContent);
  } catch (error) {
    console.error('Error in print route:', error);
    res.status(500).send('Error generating form: ' + error.message);
  }
});


module.exports = { router };
