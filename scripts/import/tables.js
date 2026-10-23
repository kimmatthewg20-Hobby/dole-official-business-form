'use strict';

// The four exported tables and their columns, exactly as migrations/0001_initial_schema.sql
// defines them. Listed in insert order: forms before the employees that reference them.

const TABLE_COLUMNS = {
  official_business: [
    'id',
    'date_created',
    'office',
    'division',
    'date_of_ob',
    'dates_of_ob',
    'location_from',
    'location_to',
    'departure_time',
    'return_time',
    'purpose',
    'approved_by',
    'approved_by_position',
    'timestamp',
  ],
  employees: ['id', 'ob_id', 'name', 'position'],
  employees_directory: [
    'id',
    'employee_id',
    'firstname',
    'middle_name',
    'last_name',
    'full_name',
    'position',
    'assigned_unit',
  ],
  settings: [
    'id',
    'office',
    'office_head',
    'office_head_position',
    'location_from',
    'division_options',
    'assistant_regional_director',
    'admin_password',
  ],
};

const TABLES_IN_INSERT_ORDER = Object.keys(TABLE_COLUMNS);

module.exports = { TABLE_COLUMNS, TABLES_IN_INSERT_ORDER };
